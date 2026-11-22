<?php

namespace App\Http\Middleware;

use App\Services\SubscriptionService;
use App\Support\ApiError;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveSubscription
{
    public function __construct(private SubscriptionService $subs) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user->isAdmin() && $this->subs->status($user) !== 'active') {
            return ApiError::make('subscription_inactive', 'Tu suscripción no está activa. Elige un plan para seguir viendo.', 403);
        }

        return $next($request);
    }
}
