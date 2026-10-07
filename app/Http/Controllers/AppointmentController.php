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

        // Allows both 'staff' and 'provider' roles to see the full administrative overview
        if ($user->role === 'staff' || $user->role === 'provider') {
            return response()->json(
                Appointment::with(['client', 'service', 'time_slot'])->orderBy('id', 'desc')->get()
            );
        }

        // If the logged-in user is a client, show ONLY their custom booking profile records
        return response()->json(
            Appointment::where('client_id', $user->id)->with(['service', 'time_slot'])->orderBy('id', 'desc')->get()
        );
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

        // Prevent double booking conflict
        if ($timeSlot->status !== 'available') {
            return response()->json([
                'message' => 'That slot is no longer available.',
                'errors' => ['time_slot_id' => ['That slot is no longer available.']]
            ], 422);
        }

        // Lock slot and create appointment record
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
        // Guard checking if appointment is historical or already processed
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

        // Guard checking if target slot is occupied
        if ($newSlot->status !== 'available') {
            return response()->json([
                'message' => 'That slot is no longer available.',
                'errors' => ['time_slot_id' => ['That slot is no longer available.']]
            ], 422);
        }

        // Release current slot
        $appointment->time_slot->update(['status' => 'available']);

        // Claim target slot and update appointment record
        $newSlot->update(['status' => 'booked']);
        $appointment->update(['time_slot_id' => $newSlot->id]);

        return response()->json($appointment->load(['time_slot', 'service']));
    }

    /**
     * Mark an appointment status as no-show.
     */
    public function markNoShow(Appointment $appointment)
    {
        // Guard checking if the appointment was already processed as cancelled
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
