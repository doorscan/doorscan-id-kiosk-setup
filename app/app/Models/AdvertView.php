<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdvertView extends Model
{
    protected $fillable = [
        'advert_id',
        'started_at',
        'ended_at',
        'displayed_seconds',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'displayed_seconds' => 'integer',
        ];
    }

    public function advert(): BelongsTo
    {
        return $this->belongsTo(Advert::class);
    }
}
