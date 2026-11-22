<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\ApiError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class PasswordResetController extends Controller
{
    public function forgot(Request $request): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        $request->validate(['email' => ['required', 'email']]);

        Password::sendResetLink($request->only('email'));

        return response()->json(['message' => 'Si el correo está registrado, te enviamos un enlace.']);
    }

    public function reset(Request $request): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->update(['password' => $password]);
                $user->tokens()->delete();
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            return ApiError::make('invalid_reset_token', 'El enlace no es válido o ya venció. Pide uno nuevo.', 422);
        }

        return response()->json(['message' => 'Tu contraseña fue cambiada. Ya puedes iniciar sesión.']);
    }
}
