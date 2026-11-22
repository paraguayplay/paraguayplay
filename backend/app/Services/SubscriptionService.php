<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;

class SubscriptionService
{
    /** @return 'pending'|'active'|'expired'|'suspended' */
    public function status(User $user, ?Carbon $now = null): string
    {
        $now ??= Carbon::now();

        return match ($user->status) {
            'suspended' => 'suspended',
            'pending' => 'pending',
            default => $user->expires_at && $user->expires_at->greaterThan($now) ? 'active' : 'expired',
        };
    }

    public function daysLeft(User $user, ?Carbon $now = null): ?int
    {
        $now ??= Carbon::now();
        if ($this->status($user, $now) !== 'active') {
            return null;
        }

        return (int) ceil($now->diffInSeconds($user->expires_at) / 86400);
    }

    /** Renovar con cuenta activa suma a la fecha actual; vencida o nueva cuenta desde ahora. */
    public function computeExpiry(?Carbon $currentExpiry, int $days, Carbon $now): Carbon
    {
        $base = $currentExpiry && $currentExpiry->greaterThan($now) ? $currentExpiry : $now;

        return $base->copy()->addDays($days);
    }
}
