<?php

namespace App\Http\Resources;

use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class MeResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $subs = app(SubscriptionService::class);
        $pending = $this->planRequests()->where('status', 'pending')->latest('id')->first();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role,
            'subscription' => [
                'status' => $subs->status($this->resource),
                'plan' => $this->plan ? [
                    'id' => $this->plan->id,
                    'name' => $this->plan->name,
                    'price_gs' => $this->plan->price_gs,
                    'duration_days' => $this->plan->duration_days,
                ] : null,
                'expires_at' => $this->expires_at?->toIso8601String(),
                'days_left' => $subs->daysLeft($this->resource),
            ],
            'pending_request' => $pending ? [
                'id' => $pending->id,
                'plan_id' => $pending->plan_id,
                'amount_gs' => $pending->amount_gs,
                'created_at' => $pending->created_at->toIso8601String(),
            ] : null,
        ];
    }
}
