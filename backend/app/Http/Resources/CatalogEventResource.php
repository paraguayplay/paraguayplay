<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin \App\Models\Event */
class CatalogEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $now = now();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'image_url' => $this->image_path ? Storage::disk('public')->url($this->image_path) : null,
            'category' => $this->category,
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'is_featured' => $this->is_featured,
            'is_live' => $this->starts_at->lessThanOrEqualTo($now) && (! $this->ends_at || $this->ends_at->greaterThan($now)),
            'link_count' => (int) ($this->links_count ?? $this->links()->count()),
        ];
    }
}
