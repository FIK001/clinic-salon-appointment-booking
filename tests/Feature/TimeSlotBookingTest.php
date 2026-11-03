<?php

use App\Models\User;
use App\Models\Provider;
use App\Models\ProviderSchedule;
use App\Models\Service;
use App\Models\TimeSlot;
use App\Models\Appointment;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->client = User::create([
        'name' => 'Test Client',
        'email' => 'testclient@web18.test',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'address' => 'Ikorodu, Lagos',
        'phone_number' => '08031112223',
        'age' => 25,
        'business_type' => 'none',
        'status' => 'approved',
    ]);

    $this->provider = Provider::create([
        'name' => 'Dr. Test Practitioner',
        'email' => 'testdoc@web18.test',
        'phone' => '08034445556',
        'specialty' => 'GP',
        'address' => 'Ikeja, Lagos',
        'bio' => 'Automated test suite profile.',
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'working_days' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    ]);

    ProviderSchedule::create([
        'provider_id' => $this->provider->id,
        'working_days' => [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
        ],
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'break_start' => '13:00:00',
        'break_end' => '14:00:00',
    ]);

    $this->service = Service::create([
        'provider_id' => $this->provider->id,
        'name' => 'General Testing Session',
        'duration_minutes' => 30,
        'price' => 5000,
    ]);

    $this->timeSlot = TimeSlot::create([
        'provider_id' => $this->provider->id,
        'start_time' => '2026-11-10 10:00:00',
        'end_time' => '2026-11-10 10:30:00',
        'status' => 'available',
    ]);
});

test('a client can successfully book an available time slot', function () {
    $response = $this->actingAs($this->client, 'sanctum')
        ->postJson('/api/appointments', [
            'time_slot_id' => $this->timeSlot->id,
            'service_id' => $this->service->id,
            'notes' => 'Test notes context parameter.',
        ]);

    $response->assertStatus(201);

    $this->assertDatabaseHas('appointments', [
        'client_id' => $this->client->id,
        'time_slot_id' => $this->timeSlot->id,
        'status' => 'booked',
    ]);

    $this->assertDatabaseHas('time_slots', [
        'id' => $this->timeSlot->id,
        'status' => 'booked',
    ]);
});

test('a client cannot double book an already occupied time slot', function () {
    $this->timeSlot->update([
        'status' => 'booked',
    ]);

    $response = $this->actingAs($this->client, 'sanctum')
        ->postJson('/api/appointments', [
            'time_slot_id' => $this->timeSlot->id,
            'service_id' => $this->service->id,
        ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['time_slot_id']);
});

test('a client cannot book a slot that overlaps an existing appointment', function () {
    $this->timeSlot->update([
        'status' => 'booked',
    ]);

    $existingAppointment = Appointment::create([
        'client_id' => $this->client->id,
        'time_slot_id' => $this->timeSlot->id,
        'service_id' => $this->service->id,
        'status' => 'booked',
    ]);

    $existingAppointment = $existingAppointment->fresh();

    $this->assertDatabaseHas('appointments', [
        'id' => $existingAppointment->id,
        'status' => 'booked',
        'time_slot_id' => $this->timeSlot->id,
    ]);

    $this->assertNotNull($existingAppointment->time_slot);

    $this->assertSame(
        $this->provider->id,
        $existingAppointment->time_slot->provider_id
    );

    $this->assertSame('booked', $existingAppointment->status);

    // Confirm the existing booking can be found through the provider relationship.
    $this->assertSame(
        1,
        Appointment::where('status', 'booked')
            ->whereHas('time_slot', function ($query) {
                $query->where('provider_id', $this->provider->id);
            })
            ->count()
    );

    // Confirm the existing appointment's service relationship and duration.
    $this->assertNotNull(
        $existingAppointment->service,
        'The existing appointment service relationship is missing.'
    );

    $this->assertSame(
        30,
        (int) $existingAppointment->service->duration_minutes
    );

    $overlappingSlot = TimeSlot::create([
        'provider_id' => $this->provider->id,
        'start_time' => '2026-11-10 10:15:00',
        'end_time' => '2026-11-10 10:45:00',
        'status' => 'available',
    ]);

    $response = $this->actingAs($this->client, 'sanctum')
        ->postJson('/api/appointments', [
            'time_slot_id' => $overlappingSlot->id,
            'service_id' => $this->service->id,
        ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['time_slot_id']);

    $this->assertDatabaseCount('appointments', 1);

    $this->assertDatabaseHas('time_slots', [
        'id' => $overlappingSlot->id,
        'status' => 'available',
    ]);
});
