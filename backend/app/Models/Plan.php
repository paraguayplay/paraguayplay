<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'price_gs', 'duration_days', 'is_active', 'sort_order'];

    protected function casts(): array
    {
        return [
            'price_gs' => 'integer',
            'duration_days' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
