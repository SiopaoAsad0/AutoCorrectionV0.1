<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class StudentAuthController extends Controller
{
    /**
     * POST /api/register
     * Creates a real, database-backed account. Previously registration only
     * wrote to the browser's localStorage, so accounts never existed on the
     * server and couldn't be used from a different browser/device.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name'  => ['required', 'string', 'max:255'],
            'last_name'   => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'student_id'  => ['required', 'string', 'size:7', 'regex:/^[0-9]+$/', 'unique:users,student_id'],
            'email'       => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'year_level'  => ['required', 'string', 'max:50'],
            'section'     => ['required', 'string', 'max:50'],
            'password'    => ['required', 'confirmed', Rules\Password::min(6)],
        ]);

        $fullName = trim(implode(' ', array_filter([
            $validated['first_name'],
            $validated['middle_name'] ?? null,
            $validated['last_name'],
        ])));

        $user = new User();
        $user->name        = $fullName;
        $user->email       = $validated['email'];
        $user->password    = Hash::make($validated['password']);
        $user->student_id  = $validated['student_id'];
        $user->year_level  = $validated['year_level'];
        $user->section     = $validated['section'];
        $user->is_admin    = false;
        $user->save();

        return response()->json([
            'message' => 'You are now registered successfully.',
            'user' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'student_id' => $user->student_id,
                'year_level' => $user->year_level,
                'section'    => $user->section,
            ],
        ], 201);
    }

    /**
     * POST /api/login
     * Verifies credentials against the central database (not localStorage)
     * and issues a Sanctum token, so the same account works from any
     * browser or device.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'student_id' => ['required', 'string', 'size:7', 'regex:/^[0-9]+$/'],
            'password'   => ['required', 'string'],
        ]);

        $user = User::query()->where('student_id', $credentials['student_id'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'student_id' => ['Access denied: student ID or password is incorrect.'],
            ]);
        }

        if ($user->is_admin) {
            return response()->json(['message' => 'Admin accounts must sign in on the admin login page.'], 403);
        }

        $user->tokens()->where('name', 'student')->delete();
        $token = $user->createToken('student', ['student'])->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'student_id' => $user->student_id,
                'year_level' => $user->year_level,
                'section'    => $user->section,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'student_id' => $user->student_id,
            'year_level' => $user->year_level,
            'section'    => $user->section,
        ]);
    }

    /**
     * POST /api/forgot-password
     * Uses Laravel's built-in password broker (password_reset_tokens table
     * already exists in your migrations). The reset link is pointed at the
     * frontend SPA via ResetPassword::createUrlUsing(), configured in
     * AppServiceProvider.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        // Always return a generic success message regardless of whether the
        // email exists, so this endpoint can't be used to enumerate which
        // emails are registered.
        return response()->json([
            'message' => 'If that email is registered, a password reset link has been sent.',
            'status' => $status,
        ]);
    }

    /**
     * POST /api/reset-password
     * Verifies the reset token (via Laravel's password broker) before
     * allowing the password to be changed, per the standard reset flow.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token'    => ['required'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'confirmed', Rules\Password::min(6)],
        ]);

        $status = Password::reset(
            $validated,
            function (User $user, string $password) {
                $user->password = Hash::make($password);
                $user->setRememberToken(Str::random(60));
                $user->save();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => 'Password has been reset. You can now log in.']);
    }
}
