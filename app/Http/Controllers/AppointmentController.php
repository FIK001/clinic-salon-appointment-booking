<?php

namespace App\Http\Controllers;

use App\Mail\AppointmentBooked;
use App\Mail\AppointmentCancelled;
use App\Mail\AppointmentRescheduled;
use App\Models\Appointment;
use App\Models\Provider;
use App\Models\ProviderSchedule;
use App\Models\Service;
use App\Models\TimeSlot;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    private function isApprovedStaff(): bool
    {
        $user = Auth::user();

        return $user && $user->role === 'staff'
            && $user->status === 'approved';
    }

    private function ensureOwner(Appointment $appointment): void
    {
        if ((int) $appointment->client_id !== (int) Auth::id()) {
            abort(403, 'You can only change your own appointments.');
        }
    }

    private function ensureOpen(Appointment $appointment): void
    {
        if (in_array($appointment->status, ['cancelled', 'completed', 'no_show'])) {
            throw ValidationException::withMessages([
                'status' => ['This appointment can no longer be changed.'],
            ]);
        }
    }

    /**
     * Validate provider schedule, working hours, breaks and existing bookings.
     */
    private function validateAppointmentAvailability(
        TimeSlot $slot,
        Service $service,
        Provider $provider,
        ?int $excludeAppointmentId = null
    ): void {
        if ((int) $service->provider_id !== (int) $provider->id) {
            throw ValidationException::withMessages([
                'service_id' => ['The selected service does not belong to this provider.'],
            ]);
        }

        if ((int) $slot->provider_id !== (int) $provider->id) {
            throw ValidationException::withMessages([
                'time_slot_id' => ['The selected slot does not belong to this provider.'],
            ]);
        }

        $duration = (int) $service->duration_minutes;

        if ($duration <= 0) {
            throw ValidationException::withMessages([
                'service_id' => ['The selected service has an invalid duration.'],
            ]);
        }

        $schedule = ProviderSchedule::where('provider_id', $provider->id)->first();

        if (!$schedule || empty($schedule->working_days)) {
            throw ValidationException::withMessages([
                'time_slot_id' => ['This provider has no working schedule configured.'],
            ]);
        }

        $start = $slot->start_time->copy();
        $end = $start->copy()->addMinutes($duration);

        if ($start->lte(now())) {
            throw ValidationException::withMessages([
                'time_slot_id' => ['You cannot book an appointment in the past.'],
            ]);
        }

        $workingDays = array_map(
            fn ($day) => strtolower(trim($day)),
            $schedule->working_days
        );

        if (!in_array(strtolower($start->format('l')), $workingDays, true)) {
            throw ValidationException::withMessages([
                'time_slot_id' => ['This provider does not work on the selected day.'],
            ]);
        }

        $date = $start->format('Y-m-d');

        $workStart = Carbon::parse($date . ' ' . $schedule->start_time);
        $workEnd = Carbon::parse($date . ' ' . $schedule->end_time);

        if ($start->lt($workStart) || $end->gt($workEnd)) {
            throw ValidationException::withMessages([
                'time_slot_id' => [
                    'The appointment duration falls outside the provider working hours.',
                ],
            ]);
        }

        if ($schedule->break_start && $schedule->break_end) {
            $breakStart = Carbon::parse($date . ' ' . $schedule->break_start);
            $breakEnd = Carbon::parse($date . ' ' . $schedule->break_end);

            if ($start->lt($breakEnd) && $end->gt($breakStart)) {
                throw ValidationException::withMessages([
                    'time_slot_id' => [
                        'This appointment overlaps the provider break period.',
                    ],
                ]);
            }
        }

        /*
         * Check existing bookings directly in the database.
         * Each appointment's end time is calculated using its service duration.
         */
        $existingAppointments = DB::table('appointments as a')
            ->join('time_slots as ts', 'a.time_slot_id', '=', 'ts.id')
            ->join('services as s', 'a.service_id', '=', 's.id')
            ->where('a.status', 'booked')
            ->where('ts.provider_id', $provider->id)
            ->whereDate('ts.start_time', $date)
            ->when(
                $excludeAppointmentId,
                function ($query) use ($excludeAppointmentId) {
                    $query->where('a.id', '!=', $excludeAppointmentId);
                }
            )
            ->select([
                'a.id',
                'ts.start_time',
                's.duration_minutes',
            ])
            ->get();

        foreach ($existingAppointments as $existing) {
            $existingStart = Carbon::parse($existing->start_time);
            $existingDuration = (int) $existing->duration_minutes;

            if ($existingDuration <= 0) {
                continue;
            }

            $existingEnd = $existingStart->copy()
                ->addMinutes($existingDuration);

            if ($start->lt($existingEnd) && $end->gt($existingStart)) {
                throw ValidationException::withMessages([
                    'time_slot_id' => [
                        'This time overlaps another booked appointment. Please select another time.',
                    ],
                ]);
            }
        }
    }

    /**
     * Retrieve appointments for staff or the authenticated client.
     */
    public function index()
    {
        if ($this->isApprovedStaff()) {
            $appointments = Appointment::with([
                'client',
                'service',
                'time_slot.provider',
            ])
                ->orderBy('id', 'desc')
                ->get();

            return response()->json($appointments);
        }

        $appointments = Appointment::where('client_id', Auth::id())
            ->with([
                'service',
                'time_slot.provider',
            ])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($appointments);
    }

    /**
     * Save a consultation report.
     */
    public function saveReport(Request $request)
    {
        if (!$this->isApprovedStaff()) {
            return response()->json([
                'message' => 'Unauthorized operation access blocked.',
            ], 403);
        }

        $validated = $request->validate([
            'appointment_id' => 'required|exists:appointments,id',
            'consultation_report' => 'required|string',
        ]);

        $appointment = Appointment::findOrFail(
            $validated['appointment_id']
        );

        $appointment->update([
            'consultation_report' => $validated['consultation_report'],
        ]);

        return response()->json([
            'message' => 'Consultation report updated successfully.',
            'appointment' => $appointment->fresh()->load([
                'client',
                'service',
                'time_slot.provider',
            ]),
        ]);
    }

    /**
     * Book an appointment and queue confirmation email.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'time_slot_id' => 'required|exists:time_slots,id',
            'service_id' => 'required|exists:services,id',
            'notes' => 'nullable|string',
        ]);

        $appointment = DB::transaction(function () use ($validated) {
            $initialSlot = TimeSlot::findOrFail(
                $validated['time_slot_id']
            );

            $provider = Provider::lockForUpdate()
                ->findOrFail($initialSlot->provider_id);

            $slot = TimeSlot::lockForUpdate()
                ->findOrFail($validated['time_slot_id']);

            if ($slot->status !== 'available') {
                throw ValidationException::withMessages([
                    'time_slot_id' => ['That slot is no longer available.'],
                ]);
            }

            $service = Service::findOrFail(
                $validated['service_id']
            );

            $this->validateAppointmentAvailability(
                $slot,
                $service,
                $provider
            );

            $appointment = Appointment::create([
                'client_id' => Auth::id(),
                'time_slot_id' => $slot->id,
                'service_id' => $service->id,
                'status' => 'booked',
                'notes' => $validated['notes'] ?? null,
            ]);

            $slot->update([
                'status' => 'booked',
            ]);

            return $appointment;
        });

        $appointment->load([
            'client',
            'service',
            'time_slot.provider',
        ]);

        try {
            if ($appointment->client && $appointment->client->email) {
                Mail::to($appointment->client->email)
                    ->queue(new AppointmentBooked($appointment));

                Log::info(
                    "Booking confirmation email queued for appointment #{$appointment->id}."
                );
            } else {
                Log::warning(
                    "Booking confirmation email skipped: no client email for appointment #{$appointment->id}."
                );
            }
        } catch (\Throwable $e) {
            Log::error(
                "Booking confirmation email could not be queued for appointment #{$appointment->id}: "
                . $e->getMessage()
            );
        }

        return response()->json($appointment, 201);
    }

    /**
     * Cancel an appointment and queue a cancellation email.
     */
    public function cancel(Appointment $appointment)
    {
        $this->ensureOwner($appointment);
        $this->ensureOpen($appointment);

        $appointment = DB::transaction(function () use ($appointment) {
            $initialSlot = TimeSlot::findOrFail(
                $appointment->time_slot_id
            );

            $provider = Provider::lockForUpdate()
                ->findOrFail($initialSlot->provider_id);

            $appointment = Appointment::lockForUpdate()
                ->findOrFail($appointment->id);

            $this->ensureOwner($appointment);
            $this->ensureOpen($appointment);

            $slot = TimeSlot::lockForUpdate()
                ->findOrFail($appointment->time_slot_id);

            if ($slot->start_time->lt(now())) {
                throw ValidationException::withMessages([
                    'status' => ['This appointment can no longer be cancelled.'],
                ]);
            }

            $appointment->update([
                'status' => 'cancelled',
            ]);

            $slot->update([
                'status' => 'available',
            ]);

            return $appointment->fresh()->load([
                'client',
                'service',
                'time_slot.provider',
            ]);
        });

        try {
            if ($appointment->client && $appointment->client->email) {
                Mail::to($appointment->client->email)
                    ->queue(new AppointmentCancelled($appointment));

                Log::info(
                    "Cancellation email queued for appointment #{$appointment->id}."
                );
            } else {
                Log::warning(
                    "Cancellation email skipped: no client email for appointment #{$appointment->id}."
                );
            }
        } catch (\Throwable $e) {
            Log::error(
                "Cancellation email could not be queued for appointment #{$appointment->id}: "
                . $e->getMessage()
            );
        }

        return response()->json($appointment);
    }

    /**
     * Reschedule an appointment and queue a confirmation email.
     */
    public function reschedule(Request $request, Appointment $appointment)
    {
        $this->ensureOwner($appointment);
        $this->ensureOpen($appointment);

        $validated = $request->validate([
            'time_slot_id' => 'required|exists:time_slots,id',
        ]);

        $result = DB::transaction(function () use ($validated, $appointment) {
            $initialOldSlot = TimeSlot::findOrFail(
                $appointment->time_slot_id
            );

            $provider = Provider::lockForUpdate()
                ->findOrFail($initialOldSlot->provider_id);

            $appointment = Appointment::lockForUpdate()
                ->findOrFail($appointment->id);

            $this->ensureOwner($appointment);
            $this->ensureOpen($appointment);

            $oldSlot = TimeSlot::lockForUpdate()
                ->findOrFail($appointment->time_slot_id);

            $newSlot = TimeSlot::lockForUpdate()
                ->findOrFail($validated['time_slot_id']);

            $previousDate = $oldSlot->start_time->format('l, d F Y');
            $previousTime = $oldSlot->start_time->format('h:i A');

            if ((int) $newSlot->id === (int) $oldSlot->id) {
                throw ValidationException::withMessages([
                    'time_slot_id' => ['You have already booked this time slot.'],
                ]);
            }

            if ($newSlot->status !== 'available') {
                throw ValidationException::withMessages([
                    'time_slot_id' => ['That slot is no longer available.'],
                ]);
            }

            if ((int) $newSlot->provider_id !== (int) $provider->id) {
                throw ValidationException::withMessages([
                    'time_slot_id' => [
                        'The new slot must belong to the same provider.',
                    ],
                ]);
            }

            $service = Service::findOrFail($appointment->service_id);

            $this->validateAppointmentAvailability(
                $newSlot,
                $service,
                $provider,
                $appointment->id
            );

            $appointment->update([
                'time_slot_id' => $newSlot->id,
            ]);

            $oldSlot->update([
                'status' => 'available',
            ]);

            $newSlot->update([
                'status' => 'booked',
            ]);

            $updatedAppointment = $appointment->fresh()->load([
                'client',
                'service',
                'time_slot.provider',
            ]);

            return [
                'appointment' => $updatedAppointment,
                'previous_date' => $previousDate,
                'previous_time' => $previousTime,
            ];
        });

        $appointment = $result['appointment'];

        try {
            if ($appointment->client && $appointment->client->email) {
                Mail::to($appointment->client->email)
                    ->queue(new AppointmentRescheduled(
                        $appointment,
                        $result['previous_date'],
                        $result['previous_time']
                    ));

                Log::info(
                    "Rescheduling email queued for appointment #{$appointment->id}."
                );
            } else {
                Log::warning(
                    "Rescheduling email skipped: no client email for appointment #{$appointment->id}."
                );
            }
        } catch (\Throwable $e) {
            Log::error(
                "Rescheduling email could not be queued for appointment #{$appointment->id}: "
                . $e->getMessage()
            );
        }

        return response()->json($appointment);
    }

    /**
     * Mark a booked appointment as a no-show.
     */
    public function markNoShow(Appointment $appointment)
    {
        if (!$this->isApprovedStaff()) {
            return response()->json([
                'message' => 'Unauthorized operation access blocked.',
            ], 403);
        }

        if ($appointment->status !== 'booked') {
            return response()->json([
                'message' => 'Only a booked appointment can be marked as a no-show.',
            ], 422);
        }

        $appointment->update([
            'status' => 'no_show',
        ]);

        return response()->json(
            $appointment->fresh()->load([
                'client',
                'service',
                'time_slot.provider',
            ])
        );
    }

    /**
     * Mark a booked appointment as completed.
     */
    public function markCompleted(Appointment $appointment)
    {
        if (!$this->isApprovedStaff()) {
            return response()->json([
                'message' => 'Unauthorized operation access blocked.',
            ], 403);
        }

        if ($appointment->status !== 'booked') {
            return response()->json([
                'message' => 'Only a booked appointment can be marked as completed.',
            ], 422);
        }

        $appointment->update([
            'status' => 'completed',
        ]);

        return response()->json(
            $appointment->fresh()->load([
                'client',
                'service',
                'time_slot.provider',
            ])
        );
    }
}
