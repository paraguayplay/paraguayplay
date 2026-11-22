<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ForbiddenHostException;
use App\Services\ManifestRewriter;
use App\Services\ProxyUrlSigner;
use App\Services\SafeFetcher;
use App\Services\SubscriptionService;
use App\Support\ApiError;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use RuntimeException;

class ManifestProxyController extends Controller
{
    public function __construct(
        private SafeFetcher $fetcher,
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

        $headers = $signed['headers'] ?? [];
        try {
            $origin = $this->fetcher->get($signed['url'], $headers);
        } catch (ForbiddenHostException) {
            return ApiError::make('forbidden_host', 'Origen no permitido.', 403);
        } catch (RuntimeException $e) {
            return $e->getMessage() === 'origin_unreachable'
                ? ApiError::make('origin_unreachable', 'El proveedor no responde.', 502)
                : ApiError::make('origin_error', 'El proveedor devolvió un error.', 502);
        }

        $isDash = str_contains($origin['body'], '<MPD') || str_contains($origin['content_type'], 'dash');
        $rewritten = $isDash
            ? $this->rewriter->rewriteDash($origin['body'], $origin['url'])
            : $this->rewriter->rewriteHls($origin['body'], $origin['url'], fn (string $nested) => ProxyUrlSigner::sign(
                $nested, max(60, $signed['expires'] - now()->getTimestamp()), $user->id, $token->id, $headers,
            ));

        return response($rewritten, 200, [
            'Content-Type' => $isDash ? 'application/dash+xml' : 'application/vnd.apple.mpegurl',
            'X-Content-Type-Options' => 'nosniff',
            'Access-Control-Allow-Origin' => '*',
            'Cache-Control' => 'no-store',
        ]);
    }
}
