<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

/**
 * Password reset by emailed one-time code (OTP):
 *
 *   1. POST /api/password/otp/send    { email }                        -> emails a 6-digit code
 *   2. POST /api/password/otp/verify  { email, otp }                   -> checks the code
 *   3. POST /api/password/otp/reset   { email, otp, password, ... }    -> sets the new password
 *
 * Codes live in the application cache (no migration needed) and are stored
 * only as an HMAC hash, never in plain text. Each code expires after 10
 * minutes, is dead after 5 wrong guesses, and a new one can only be
 * requested once every 60 seconds per email.
 */
class PasswordOtpController extends Controller
{
    private const OTP_TTL_SECONDS = 600;
    private const RESEND_COOLDOWN_SECONDS = 60;
    private const MAX_ATTEMPTS = 5;

    private function normalize(string $email): string
    {
        return Str::lower(trim($email));
    }

    private function otpKey(string $email): string
    {
        return 'pw_otp:'.sha1($email);
    }

    private function cooldownKey(string $email): string
    {
        return 'pw_otp_cooldown:'.sha1($email);
    }

    // Keyed to the app key and bound to the email, so a stolen cache entry
    // can't be replayed against a different account.
    private function hashOtp(string $email, string $otp): string
    {
        return hash_hmac('sha256', $email.'|'.$otp, (string) config('app.key'));
    }

    private function findUser(string $email): ?User
    {
        return User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
    }

    /**
     * Returns null when the code is valid, otherwise a user-facing error
     * message. Wrong guesses are counted, and the code is destroyed once
     * the limit is reached, so a 6-digit code can't be brute-forced.
     */
    private function checkOtp(string $email, string $otp): ?string
    {
        $key = $this->otpKey($email);
        $record = Cache::get($key);

        if (! is_array($record) || ($record['expires_at'] ?? 0) < time()) {
            Cache::forget($key);
            return 'This code has expired or was never requested. Please request a new one.';
        }

        if (hash_equals((string) $record['hash'], $this->hashOtp($email, $otp))) {
            return null;
        }

        $record['attempts'] = ((int) ($record['attempts'] ?? 0)) + 1;

        if ($record['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget($key);
            return 'Too many incorrect attempts. Please request a new code.';
        }

        // Keep the original expiry rather than granting a fresh 10 minutes.
        Cache::put($key, $record, max(1, $record['expires_at'] - time()));

        $left = self::MAX_ATTEMPTS - $record['attempts'];
        return 'Incorrect code. '.$left.' attempt'.($left === 1 ? '' : 's').' left.';
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);
        $email = $this->normalize($data['email']);

        // This tells the visitor whether an account exists for the email.
        // That's deliberate: registration already reveals it ("email has
        // already been taken"), so hiding it here would only leave a
        // student who mistyped their email waiting for a code that will
        // never arrive.
        $user = $this->findUser($email);
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['No account is registered with that email.'],
            ]);
        }

        if (! Cache::add($this->cooldownKey($email), 1, self::RESEND_COOLDOWN_SECONDS)) {
            return response()->json([
                'message' => 'Please wait a minute before requesting another code.',
            ], 429);
        }

        $otp = (string) random_int(100000, 999999);

        Cache::put($this->otpKey($email), [
            'hash' => $this->hashOtp($email, $otp),
            'attempts' => 0,
            'expires_at' => time() + self::OTP_TTL_SECONDS,
        ], self::OTP_TTL_SECONDS);

        $minutes = intdiv(self::OTP_TTL_SECONDS, 60);
        $body = "Hello {$user->name},\n\n"
            ."Your PNC Spell Checker password reset code is:\n\n"
            ."    {$otp}\n\n"
            ."It expires in {$minutes} minutes. If you didn't request this, you can ignore this email — "
            ."your password will not change.";

        try {
            $subject = 'Your PNC Spell Checker password reset code';

            if (config('services.brevo.key')) {
                // HTTPS API: works on Render's free plan, which blocks SMTP ports.
                $response = Http::withHeaders(['api-key' => config('services.brevo.key')])
                    ->timeout(15)
                    ->acceptJson()
                    ->withoutRedirecting()
                    ->post('https://api.brevo.com/v3/smtp/email', [
                        'sender'      => ['name' => 'PNC Spell Checker', 'email' => config('services.brevo.sender')],
                        'to'          => [['email' => $user->email, 'name' => $user->name]],
                        'subject'     => $subject,
                        'textContent' => $body,
                    ]);

                // Any non-2xx counts as a failure, including redirects.
                if (! $response->successful()) {
                    throw new \RuntimeException(
                        'Brevo '.$response->status()
                        .' location='.$response->header('Location')
                        .' body='.mb_substr($response->body(), 0, 300)
                    );
                }
            } else {
                // Local development: falls back to the MAIL_* settings (e.g. Mailpit).
                Mail::raw($body, function ($message) use ($user, $subject) {
                    $message->to($user->email, $user->name)->subject($subject);
                });
            }
        } catch (\Throwable $e) {
            // Sent inline (not after the response) so a delivery failure is
            // reported to the user instead of leaving them waiting.
            Cache::forget($this->otpKey($email));
            Cache::forget($this->cooldownKey($email));
            Log::error('Password reset OTP email failed: '.$e->getMessage());

            return response()->json([
                'message' => 'We could not send the code right now. Please try again in a moment.',
            ], 502);
        }

        return response()->json([
            'message' => 'A 6-digit code has been sent to your email.',
            'expires_in' => self::OTP_TTL_SECONDS,
            'resend_in' => self::RESEND_COOLDOWN_SECONDS,
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'otp' => ['required', 'digits:6'],
        ]);

        $error = $this->checkOtp($this->normalize($data['email']), $data['otp']);
        if ($error !== null) {
            throw ValidationException::withMessages(['otp' => [$error]]);
        }

        return response()->json(['message' => 'Code verified.']);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'otp' => ['required', 'digits:6'],
            'password' => ['required', 'confirmed', Rules\Password::min(6)],
        ]);
        $email = $this->normalize($data['email']);

        // The code is checked again here, not just in verify(), so nobody
        // can skip straight to this endpoint without a valid code.
        $error = $this->checkOtp($email, $data['otp']);
        if ($error !== null) {
            throw ValidationException::withMessages(['otp' => [$error]]);
        }

        $user = $this->findUser($email);
        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['No account is registered with that email.'],
            ]);
        }

        $user->password = Hash::make($data['password']);
        $user->setRememberToken(Str::random(60));
        $user->save();

        // Single use: the code can't be replayed once the password is changed.
        Cache::forget($this->otpKey($email));
        Cache::forget($this->cooldownKey($email));

        // Sign the account out everywhere, in case someone else was in it.
        if (Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        return response()->json(['message' => 'Your password has been changed. You can now log in.']);
    }
}
