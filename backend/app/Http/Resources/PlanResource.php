<?php

namespace App\Http\Resources;

use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Plan */
class PlanResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'price_gs' => $this->price_gs,
            'price_label' => Money::gs($this->price_gs),
            'duration_days' => $this->duration_days,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
        ];
    }
}
