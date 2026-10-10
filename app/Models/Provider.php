<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Provider extends Model
{
    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'specialty',
        'address', // Injected to map physical locations for proximity recommendation algorithms
        'bio',
        'start_time',
        'end_time',
        'working_days',
    ];

    /**
     * The attributes that should be cast to native types.
     */
    protected $casts = [
        'working_days' => 'array',
    ];

    /**
     * Get the services offered by this provider.
     */
    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    /**
     * Get the calendar time slots available for this provider.
     */
    public function timeSlots(): HasMany
    {
        return $this->hasMany(TimeSlot::class);
    }
}
