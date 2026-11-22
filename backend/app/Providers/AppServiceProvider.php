<?php

namespace App\Providers;

use App\Services\SubscriptionService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SubscriptionService::class);
    }

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        RateLimiter::for('login', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email')));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        // Por sesión (k = id del token firmado), no por IP: muchos usuarios comparten IP (CGNAT de operadoras).
        RateLimiter::for('proxy', function (Request $request) {
            $token = (string) $request->query('k', '');

            return ctype_digit($token)
                ? Limit::perMinute(180)->by('proxy:k:'.$token)
                : Limit::perMinute(60)->by('proxy:ip:'.$request->ip());
        });
    }
}
