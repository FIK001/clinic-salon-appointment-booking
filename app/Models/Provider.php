<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Provider extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'specialty',
        'address',
        'bio',
        'start_time',
        'end_time',
        'working_days',
    ];

    protected $casts = [
        'working_days' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function timeSlots(): HasMany
    {
        return $this->hasMany(TimeSlot::class);
    }

    public function schedule(): HasOne
    {
        return $this->hasOne(ProviderSchedule::class);
    }
}
