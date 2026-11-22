<?php

namespace App\Http\Controllers;

use App\Http\Resources\MeResource;
use App\Models\TvLoginCode;
use App\Support\ApiError;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TvLoginController extends Controller
{
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function create(Request $request)
    {
        $data = $request->validate(['device_name' => ['required', 'string', 'max:100']]);
        TvLoginCode::where('expires_at', '<', now()->subDay())->delete();

        do {
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
        } while (TvLoginCode::where('code', $code)->exists());

        $row = TvLoginCode::create([
            'code' => $code,
            'device_name' => $data['device_name'],
            'expires_at' => now()->addMinutes(10),
        ]);

        return response()->json([
            'code' => $code,
            'qr_url' => rtrim(config('app.frontend_url'), '/').'/vincular?code='.$code,
            'expires_at' => $row->expires_at->toIso8601String(),
        ], 201);
    }

    public function poll(string $code)
    {
        $row = $this->findUsable($code);
        if (! $row) {
            return $this->expired();
        }
        if (! $row->user_id) {
            return response()->json(['status' => 'waiting']);
        }

        $payload = [
            'status' => 'approved',
            'token' => $row->token,
            'session_key' => $row->session_key,
            'user' => new MeResource($row->user()->first() ?? abort(410)),
        ];
        $row->update(['consumed' => true, 'token' => null, 'session_key' => null]);

        return response()->json($payload);
    }

    public function confirm(Request $request, string $code)
    {
        return DB::transaction(function () use ($request, $code) {
            $row = $this->findUsable($code, lock: true);
            if (! $row || $row->user_id) {
                return $this->expired();
            }

            $user = $request->user();
            if (! $user->isAdmin()) {
                $user->tokens()->delete();
            }
            $issued = AuthController::issueToken($user, $row->device_name);
            $row->update(['user_id' => $user->id, 'token' => $issued['token'], 'session_key' => $issued['session_key']]);

            return response()->json(['message' => 'Listo. Tu TV ya está conectado. Esta sesión del celular se cerró.']);
        });
    }

    private function findUsable(string $code, bool $lock = false): ?TvLoginCode
    {
        $query = TvLoginCode::where('code', strtoupper($code))->where('consumed', false)->where('expires_at', '>', now());

        return ($lock ? $query->lockForUpdate() : $query)->first();
    }

    private function expired()
    {
        return ApiError::make('code_expired', 'El código venció. Genera uno nuevo en el TV.', 410);
    }
}
