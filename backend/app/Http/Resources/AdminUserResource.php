<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/** @mixin \App\Models\User */
class AdminUserResource extends MeResource
{
    public function toArray(Request $request): array
    {
        return array_merge(parent::toArray($request), [
            'status' => $this->status,
            'admin_notes' => $this->admin_notes,
            'created_at' => $this->created_at?->toIso8601String(),
            'active_device' => $this->tokens()->latest('id')->value('name'),
        ]);
    }
}
