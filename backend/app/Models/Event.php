<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'description', 'image_path', 'category', 'starts_at', 'ends_at', 'is_visible', 'is_featured'];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_visible' => 'boolean',
            'is_featured' => 'boolean',
        ];
    }

    public function links(): HasMany
    {
        return $this->hasMany(EventLink::class)->orderBy('sort_order')->orderBy('id');
    }
}
