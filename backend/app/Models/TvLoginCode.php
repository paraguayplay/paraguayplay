<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TvLoginCode extends Model
{
    protected $fillable = ['code', 'device_name', 'user_id', 'token', 'session_key', 'consumed', 'expires_at'];

    protected $hidden = ['token', 'session_key'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed' => 'boolean',
            'token' => 'encrypted',
            'session_key' => 'encrypted',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
