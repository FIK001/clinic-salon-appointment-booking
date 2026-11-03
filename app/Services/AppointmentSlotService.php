<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Provider;
use App\Models\ProviderSchedule;
use App\Models\Service;
use App\Models\TimeSlot;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AppointmentSlotService
{
    /**
     * Generate and retrieve available appointment slots.
     */
    public function generate(
        Provider $provider,
        Service $service,
        string $date
    ): Collection {
        if ((int) $service->provider_id !== (int) $provider->id) {
            return collect();
        }

        $schedule = ProviderSchedule::where(
            'provider_id',
            $provider->id
        )->first();

        if (! $schedule || empty($schedule->working_days)) {
            return collect();
        }

        $day = Carbon::parse($date)->startOfDay();

        if (! in_array($day->format('l'), $schedule->working_days)) {
            return collect();
        }

        $duration = (int) $service->duration_minutes;

        if ($duration <= 0) {
            return collect();
        }

        $workStart = Carbon::parse(
            $date . ' ' . $schedule->start_time
        );

        $workEnd = Carbon::parse(
            $date . ' ' . $schedule->end_time
        );

        $breakStart = $schedule->break_start
            ? Carbon::parse($date . ' ' . $schedule->break_start)
            : null;

        $breakEnd = $schedule->break_end
            ? Carbon::parse($date . ' ' . $schedule->break_end)
            : null;

        $interval = 15;

        /*
         * Retrieve existing booked appointments and their
         * actual service durations for this provider and date.
         */
        $appointments = Appointment::with([
            'time_slot',
            'service',
        ])
            ->where('status', 'booked')
            ->whereHas('time_slot', function ($query) use ($provider, $date) {
                $query->where('provider_id', $provider->id)
                    ->whereDate('start_time', $date);
            })
            ->get();

        /*
         * Generate candidate starts and save them as
         * provider-level time slot records.
         */
        $candidate = $workStart->copy();

        while (
            $candidate->copy()->addMinutes($duration)->lte($workEnd)
        ) {
            $candidateEnd = $candidate->copy()->addMinutes($duration);

            $overlapsBreak = $breakStart && $breakEnd
                && $candidate->lt($breakEnd)
                && $candidateEnd->gt($breakStart);

            if (! $overlapsBreak) {
                TimeSlot::firstOrCreate(
                    [
                        'provider_id' => $provider->id,
                        'start_time' => $candidate->format('Y-m-d H:i:s'),
                    ],
                    [
                        'end_time' => $candidate->copy()
                            ->addMinutes($interval)
                            ->format('Y-m-d H:i:s'),
                        'status' => 'available',
                    ]
                );
            }

            $candidate->addMinutes($interval);
        }

        /*
         * Retrieve available slots and exclude:
         * - Slots before working hours.
         * - Slots that extend beyond closing time.
         * - Slots that overlap the break.
         * - Slots that overlap existing appointments.
         */
        return TimeSlot::where('provider_id', $provider->id)
            ->whereDate('start_time', $date)
            ->where('status', 'available')
            ->where('start_time', '>', now())
            ->orderBy('start_time')
            ->get()
            ->filter(function ($slot) use (
                $duration,
                $workStart,
                $workEnd,
                $breakStart,
                $breakEnd,
                $appointments
            ) {
                $start = $slot->start_time->copy();
                $end = $start->copy()->addMinutes($duration);

                // Reject slots before the provider starts work.
                if ($start->lt($workStart)) {
                    return false;
                }

                // Reject slots extending beyond closing time.
                if ($end->gt($workEnd)) {
                    return false;
                }

                // Reject slots overlapping the provider's break.
                if (
                    $breakStart && $breakEnd
                    && $start->lt($breakEnd)
                    && $end->gt($breakStart)
                ) {
                    return false;
                }

                // Reject slots overlapping existing appointments.
                foreach ($appointments as $appointment) {
                    if (
                        ! $appointment->time_slot ||
                        ! $appointment->service
                    ) {
                        continue;
                    }

                    $bookedStart = $appointment->time_slot->start_time;

                    $bookedEnd = $bookedStart->copy()->addMinutes(
                        (int) $appointment->service->duration_minutes
                    );

                    if (
                        $start->lt($bookedEnd)
                        && $end->gt($bookedStart)
                    ) {
                        return false;
                    }
                }

                // Return the actual end time for the selected service.
                $slot->setAttribute(
                    'end_time',
                    $end->format('Y-m-d H:i:s')
                );

                return true;
            })
            ->values();
    }
}
