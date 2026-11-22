<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\PlanRequest */
class PlanRequestResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'plan' => new PlanResource($this->plan),
            'amount_gs' => $this->amount_gs,
            'status' => $this->status,
            'note' => $this->note,
            'resulting_expires_at' => $this->resulting_expires_at?->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
