<?php

namespace App\Http\Controllers;

use App\Models\ProviderSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProviderScheduleController extends Controller
{
    /**
     * Check that the authenticated user is an approved staff member.
     */
    private function getStaffProvider(Request $request)
    {
        $user = $request->user();

        if (
            !$user ||
            $user->role !== 'staff' ||
            $user->status !== 'approved'
        ) {
            abort(403, 'Only approved staff members can manage schedules.');
        }

        $provider = $user->provider()->first();

        if (!$provider) {
            abort(404, 'No provider profile is linked to this staff account.');
        }

        return $provider;
    }

    /**
     * Retrieve the authenticated staff member's schedule.
     */
    public function show(Request $request)
    {
        $provider = $this->getStaffProvider($request);

        $schedule = $provider->schedule;

        return response()->json([
            'provider' => [
                'id' => $provider->id,
                'name' => $provider->name,
                'specialty' => $provider->specialty,
            ],
            'schedule' => $schedule,
        ]);
    }

    /**
     * Save the authenticated staff member's schedule.
     */
    public function update(Request $request)
    {
        $provider = $this->getStaffProvider($request);

        $validated = $request->validate([
            'working_days' => 'required|array|min:1',
            'working_days.*' => [
                'required',
                'string',
                'distinct',
                'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            ],

            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',

            'break_start' => 'nullable|required_with:break_end|date_format:H:i',
            'break_end' => 'nullable|required_with:break_start|date_format:H:i|after:break_start',
        ]);

        $breakStart = $validated['break_start'] ?? null;
        $breakEnd = $validated['break_end'] ?? null;

        // Ensure the break falls within working hours.
        if ($breakStart && $breakEnd) {
            if (
                $breakStart <= $validated['start_time'] ||
                $breakEnd >= $validated['end_time']
            ) {
                throw ValidationException::withMessages([
                    'break_start' => [
                        'Your break must fall entirely within working hours.',
                    ],
                ]);
            }
        }

        $schedule = DB::transaction(function () use ($provider, $validated) {

            $schedule = ProviderSchedule::updateOrCreate(
                ['provider_id' => $provider->id],
                [
                    'working_days' => $validated['working_days'],
                    'start_time' => $validated['start_time'],
                    'end_time' => $validated['end_time'],
                    'break_start' => $validated['break_start'] ?? null,
                    'break_end' => $validated['break_end'] ?? null,
                ]
            );

            // Synchronise the old provider fields for compatibility.
            $provider->update([
                'working_days' => $validated['working_days'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
            ]);

            return $schedule;
        });

        return response()->json([
            'message' => 'Your working schedule has been saved successfully.',
            'schedule' => $schedule,
        ]);
    }
}
