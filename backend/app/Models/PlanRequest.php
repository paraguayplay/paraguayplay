<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanRequest extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'plan_id', 'amount_gs', 'status', 'resulting_expires_at', 'reviewed_at', 'note'];

    protected function casts(): array
    {
        return [
            'amount_gs' => 'integer',
            'resulting_expires_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }
}
