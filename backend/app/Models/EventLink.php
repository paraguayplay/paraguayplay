<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id', 'type', 'url', 'label', 'sort_order', 'drm_type', 'drm_clearkeys', 'drm_license_url', 'headers', 'use_proxy',
    ];

    protected $attributes = ['drm_type' => 'none', 'use_proxy' => false, 'sort_order' => 0];

    protected function casts(): array
    {
        return [
            'drm_clearkeys' => 'array',
            'headers' => 'array',
            'use_proxy' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
