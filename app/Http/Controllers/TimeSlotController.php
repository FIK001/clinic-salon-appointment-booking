<?php

namespace App\Http\Controllers;

use App\Models\TimeSlot;
use Illuminate\Http\Request;

class TimeSlotController extends Controller
{
    /**
     * Fetch available time slots for a specific provider on a given date.
     */
    public function getAvailableSlots(Request $request, $providerId)
    {
        $request->validate([
            'date' => 'required|date_format:Y-m-d',
        ]);

        $date = $request->query('date');

        // Queries the database for open slots matching the provider and date parameters
        $slots = TimeSlot::where('provider_id', $providerId)
            ->whereDate('start_time', $date)
            ->where('status', 'available')
            ->orderBy('start_time', 'asc')
            ->get();

        return response()->json($slots);
    }
}
