<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/** @mixin \App\Models\Event */
class AdminEventResource extends CatalogEventResource
{
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'image_path' => $this->image_path,
            'is_visible' => $this->is_visible,
            'links' => $this->links->map(fn ($l) => [
                'id' => $l->id,
                'type' => $l->type,
                'url' => $l->url,
                'label' => $l->label,
                'sort_order' => $l->sort_order,
                'drm_type' => $l->drm_type,
                'drm_clearkeys' => $l->drm_clearkeys,
                'drm_license_url' => $l->drm_license_url,
                'headers' => $l->headers,
                'use_proxy' => $l->use_proxy,
            ])->values(),
        ]);
    }
}
