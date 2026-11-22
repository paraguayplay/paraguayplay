<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\MeResource;
use App\Models\User;
use App\Services\PlayPayloadCipher;
use App\Support\ApiError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->safe()->only(['name', 'email', 'phone', 'password']));

        return response()->json(self::issueToken($user, $request->input('device_name')), 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->input('email'))->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            return ApiError::make('invalid_credentials', 'Correo o contraseña incorrectos.', 422);
        }

        if (! $user->isAdmin()) {
            $existing = $user->tokens()->latest('id')->first();
            if ($existing && ! $request->boolean('force')) {
                return ApiError::make(
                    'other_device_active',
                    "Tu cuenta está abierta en otro dispositivo ({$existing->name}). ¿Cerrar esa sesión y entrar aquí?",
                    409,
                    ['device' => $existing->name],
                );
            }
            $user->tokens()->delete();
        }

        return response()->json(self::issueToken($user, $request->input('device_name')));
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    /** @return array{token: string, session_key: string, user: MeResource} */
    public static function issueToken(User $user, string $deviceName): array
    {
        $new = $user->createToken($deviceName);

        return [
            'token' => $new->plainTextToken,
            'session_key' => PlayPayloadCipher::sessionKeyFor($new->accessToken->id),
            'user' => new MeResource($user->fresh()),
        ];
    }
}
