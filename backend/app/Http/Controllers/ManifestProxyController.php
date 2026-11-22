<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ManifestRewriter;
use App\Services\ProxyUrlSigner;
use App\Services\SafeHost;
use App\Services\SubscriptionService;
use App\Support\ApiError;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\PersonalAccessToken;
use Throwable;

class ManifestProxyController extends Controller
{
    private const MAX_BYTES = 2 * 1024 * 1024;

    public function __construct(
        private SafeHost $safeHost,
        private ManifestRewriter $rewriter,
        private SubscriptionService $subs,
    ) {}

    public function show(Request $request)
    {
        $signed = ProxyUrlSigner::verifyWithExpiry($request->query());
        if (! $signed) {
            return ApiError::make('invalid_signature', 'Enlace no válido o vencido.', 403);
        }

        $token = PersonalAccessToken::find($signed['token_id']);
        $user = User::find($signed['user_id']);
        if (! $token || ! $user || $token->tokenable_id !== $user->id || $token->tokenable_type !== User::class
            || (! $user->isAdmin() && $this->subs->status($user) !== 'active')) {
            return ApiError::make('session_ended', 'La sesión terminó. Vuelve a abrir el evento desde la app.', 403);
        }

        $url = $signed['url'];
        if (! $this->safeHost->isPublic($url)) {
            return ApiError::make('forbidden_host', 'Origen no permitido.', 403);
        }

        try {
            $origin = Http::timeout(8)->withHeaders($signed['headers'] ?? [])->get($url);
        } catch (Throwable) {
            return ApiError::make('origin_unreachable', 'El proveedor no responde.', 502);
        }
        if (! $origin->successful() || strlen($origin->body()) > self::MAX_BYTES) {
            return ApiError::make('origin_error', 'El proveedor devolvió un error.', 502);
        }

        $finalUrl = (string) ($origin->effectiveUri() ?? $url);
        $body = $origin->body();
        $isDash = str_contains($body, '<MPD') || str_contains(strtolower($origin->header('Content-Type')), 'dash');

        $rewritten = $isDash
            ? $this->rewriter->rewriteDash($body, $finalUrl)
            : $this->rewriter->rewriteHls($body, $finalUrl, fn (string $nested) => ProxyUrlSigner::sign(
                $nested, max(60, $signed['expires'] - now()->getTimestamp()), $user->id, $token->id, $signed['headers'] ?? [],
            ));

        $type = $origin->header('Content-Type') ?: ($isDash ? 'application/dash+xml' : 'application/vnd.apple.mpegurl');

        return response($rewritten, 200, [
            'Content-Type' => $type,
            'Access-Control-Allow-Origin' => '*',
            'Cache-Control' => 'no-store',
        ]);
    }
}
