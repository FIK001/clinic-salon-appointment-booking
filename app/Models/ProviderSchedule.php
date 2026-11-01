<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProviderSchedule extends Model
{
    protected $fillable = [
        'provider_id',
        'working_days',
        'start_time',
        'end_time',
        'break_start',
        'break_end',
    ];

    protected $casts = [
        'working_days' => 'array',
    ];

    public function provider(): BelongsTo
    {
        return $this->belongsTo(Provider::class);
    }
}
