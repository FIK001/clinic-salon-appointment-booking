<?php

namespace App\Http\Controllers;

use App\Mail\AppointmentBooked;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    /**
     * Check whether the authenticated user is an approved staff member.
     */
    private function isApprovedStaff(): bool
    {
        $user = Auth::user();

        return $user && $user->role === 'staff' && $user->status === 'approved';
    }

    /**
     * Ensure clients can only manage their own appointments.
     */
    private function ensureOwner(Appointment $appointment): void
    {
        if ($appointment->client_id !== Auth::id()) {
            abort(403, 'You can only change your own appointments.');
        }
    }

    /**
     * Prevent changes to appointments that are no longer active.
     */
    private function ensureOpen(Appointment $appointment): void
    {
        if (in_array($appointment->status, ['cancelled', 'completed', 'no_show'])) {
            throw ValidationException::withMessages([
                'status' => ['This appointment can no longer be changed.'],
            ]);
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
        if (! $this->isApprovedStaff()) {
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
     * Book an available appointment slot and queue confirmation email.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'time_slot_id' => 'required|exists:time_slots,id',
            'service_id' => 'required|exists:services,id',
            'notes' => 'nullable|string',
        ]);

        // Save the appointment and reserve the selected slot.
        $appointment = DB::transaction(function () use ($validated) {
            $slot = TimeSlot::lockForUpdate()
                ->findOrFail($validated['time_slot_id']);

            if ($slot->status !== 'available') {
                throw ValidationException::withMessages([
                    'time_slot_id' => ['That slot is no longer available.'],
                ]);
            }

            if ($slot->start_time <= now()) {
                throw ValidationException::withMessages([
                    'time_slot_id' => ['You cannot book an appointment in the past.'],
                ]);
            }

            $service = Service::findOrFail($validated['service_id']);

            if ($service->provider_id !== $slot->provider_id) {
                throw ValidationException::withMessages([
                    'service_id' => [
                        "That service does not belong to this slot's provider.",
                    ],
                ]);
            }

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

        // Load the relationships needed by the confirmation email.
        $appointment->load([
            'client',
            'service',
            'time_slot.provider',
        ]);

        // Queue the email so the booking request does not wait for Mailtrap.
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
     * Cancel an appointment.
     */
    public function cancel(Appointment $appointment)
    {
        $this->ensureOwner($appointment);
        $this->ensureOpen($appointment);

        if ($appointment->time_slot->start_time < now()) {
            throw ValidationException::withMessages([
                'status' => ['This appointment can no longer be cancelled.'],
            ]);
        }

        return DB::transaction(function () use ($appointment) {
            $appointment->update([
                'status' => 'cancelled',
            ]);

            $appointment->time_slot->update([
                'status' => 'available',
            ]);

            return response()->json(
                $appointment->fresh()->load([
                    'service',
                    'time_slot.provider',
                ])
            );
        });
    }

    /**
     * Reschedule an appointment to another available slot.
     */
    public function reschedule(Request $request, Appointment $appointment)
    {
        $this->ensureOwner($appointment);
        $this->ensureOpen($appointment);

        $validated = $request->validate([
            'time_slot_id' => 'required|exists:time_slots,id',
        ]);

        return DB::transaction(function () use ($validated, $appointment) {
            $newSlot = TimeSlot::lockForUpdate()
                ->findOrFail($validated['time_slot_id']);

            if ($newSlot->status !== 'available') {
                throw ValidationException::withMessages([
                    'time_slot_id' => ['That slot is no longer available.'],
                ]);
            }

            if ($newSlot->start_time <= now()) {
                throw ValidationException::withMessages([
                    'time_slot_id' => ['You cannot reschedule to a past time slot.'],
                ]);
            }

            $oldSlot = TimeSlot::lockForUpdate()
                ->findOrFail($appointment->time_slot_id);

            if ($newSlot->provider_id !== $oldSlot->provider_id) {
                throw ValidationException::withMessages([
                    'time_slot_id' => [
                        'The new slot must belong to the same provider.',
                    ],
                ]);
            }

            $oldSlot->update([
                'status' => 'available',
            ]);

            $appointment->update([
                'time_slot_id' => $newSlot->id,
            ]);

            $newSlot->update([
                'status' => 'booked',
            ]);

            return response()->json(
                $appointment->fresh()->load([
                    'service',
                    'time_slot.provider',
                ])
            );
        });
    }

    /**
     * Mark a booked appointment as a no-show.
     */
    public function markNoShow(Appointment $appointment)
    {
        if (! $this->isApprovedStaff()) {
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
        if (! $this->isApprovedStaff()) {
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
