<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    /**
     * POST /api/admin/login
     * Issues a Sanctum personal access token (Bearer auth) rather than
     * starting a server-side session. A session cookie can't be shared
     * between the frontend (Vercel) and backend (Render) since they're on
     * unrelated root domains -- the browser never exposes one domain's
     * cookie to JS running on the other -- so cookie/session auth cannot
     * work across this split. See StudentAuthController::login() for the
     * same change on the student side.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $loginValue = trim($credentials['email']);
        $user = User::query()
            ->where('email', $loginValue)
            ->orWhere('name', $loginValue)
            ->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        if (! $user->is_admin) {
            return response()->json(['message' => 'This account is not an administrator.'], 403);
        }

        $token = $user->createToken('admin-spa-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
            ],
        ]);
    }

    /**
     * POST /api/admin/logout
     * Revokes only the token used to authenticate this request.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_admin' => $user->is_admin,
        ]);
    }
}
