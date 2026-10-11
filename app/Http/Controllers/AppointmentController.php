<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AppointmentController extends Controller
{
    /**
     * Display a listing of appointments based on the logged-in user's role profile context.
     */
    public function index()
    {
        $user = Auth::user();

        if ($user->role === 'staff' || $user->role === 'provider') {
            return response()->json(
                Appointment::with(['client', 'service', 'time_slot'])->orderBy('id', 'desc')->get()
            );
        }

        return response()->json(
            Appointment::where('client_id', $user->id)->with(['service', 'time_slot'])->orderBy('id', 'desc')->get()
        );
    }

    /**
     * Save or update an administrative/clinical consultation report sentence payload.
     */
    public function saveReport(Request $request)
    {
        $validated = $request->validate([
            'appointment_id' => 'required|exists:appointments,id',
            'consultation_report' => 'required|string',
        ]);

        $appointment = Appointment::findOrFail($validated['appointment_id']);
        $appointment->update([
            'consultation_report' => $validated['consultation_report']
        ]);

        return response()->json([
            'message' => 'Consultation report updated successfully.',
            'appointment' => $appointment->load(['client', 'service', 'time_slot'])
        ]);
    }

    /**
     * Book a brand new slot.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'time_slot_id' => 'required|exists:time_slots,id',
            'service_id' => 'required|exists:services,id',
            'notes' => 'nullable|string',
        ]);

        $timeSlot = TimeSlot::findOrFail($validated['time_slot_id']);

        if ($timeSlot->status !== 'available') {
            return response()->json([
                'message' => 'That slot is no longer available.',
                'errors' => ['time_slot_id' => ['That slot is no longer available.']]
            ], 422);
        }

        $timeSlot->update(['status' => 'booked']);

        $appointment = Appointment::create([
            'client_id' => Auth::id(),
            'time_slot_id' => $validated['time_slot_id'],
            'service_id' => $validated['service_id'],
            'status' => 'booked',
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json($appointment->load(['time_slot', 'service']), 201);
    }

    /**
     * Cancel an active appointment and release the slot.
     */
    public function cancel(Appointment $appointment)
    {
        if ($appointment->status === 'cancelled' || $appointment->time_slot->start_time < now()) {
            return response()->json([
                'message' => 'This appointment can no longer be cancelled.',
                'errors' => ['status' => ['This appointment can no longer be cancelled.']]
            ], 422);
        }

        $appointment->update(['status' => 'cancelled']);
        $appointment->time_slot->update(['status' => 'available']);

        return response()->json($appointment->load(['time_slot', 'service']));
    }

    /**
     * Reschedule an appointment to an open alternative slot.
     */
    public function reschedule(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'time_slot_id' => 'required|exists:time_slots,id',
        ]);

        $newSlot = TimeSlot::findOrFail($validated['time_slot_id']);

        if ($newSlot->status !== 'available') {
            return response()->json([
                'message' => 'That slot is no longer available.',
                'errors' => ['time_slot_id' => ['That slot is no longer available.']]
            ], 422);
        }

        $appointment->time_slot->update(['status' => 'available']);
        $newSlot->update(['status' => 'booked']);
        $appointment->update(['time_slot_id' => $newSlot->id]);

        return response()->json($appointment->load(['time_slot', 'service']));
    }

    /**
     * Mark an appointment status as no-show.
     */
    public function markNoShow(Appointment $appointment)
    {
        if ($appointment->status === 'cancelled') {
            return response()->json([
                'message' => 'Cannot mark a cancelled appointment as a no-show.',
                'errors' => ['status' => ['Cannot mark a cancelled appointment as a no-show.']]
            ], 422);
        }

        $appointment->update(['status' => 'no_show']);

        return response()->json($appointment->load(['time_slot', 'service']));
    }
}
