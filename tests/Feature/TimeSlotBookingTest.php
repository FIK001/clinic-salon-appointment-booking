<?php

use App\Models\User;
use App\Models\Provider;
use App\Models\Service;
use App\Models\TimeSlot;
use App\Models\Appointment;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Scaffold Client user with the newly added migration variables
    $this->client = User::create([
        'name' => 'Test Client',
        'email' => 'testclient@web18.test',
        'password' => bcrypt('password123'),
        'role' => 'client',
        'address' => 'Ikorodu, Lagos',
        'phone_number' => '08031112223',
        'age' => 25,
        'business_type' => 'none',
        'status' => 'approved'
    ]);

    // Scaffold Practitioner Provider
    $this->provider = Provider::create([
        'name' => 'Dr. Test Practitioner',
        'email' => 'testdoc@web18.test',
        'phone' => '08034445556',
        'specialty' => 'GP',
        'address' => 'Ikeja, Lagos',
        'bio' => 'Automated test suite profile.',
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
        'working_days' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    ]);

    // Scaffold Related Service
    $this->service = Service::create([
        'provider_id' => $this->provider->id,
        'name' => 'General Testing Session',
        'duration_minutes' => 30,
        'price' => 5000
    ]);

    // Scaffold Open Availability Time Slot
    $this->timeSlot = TimeSlot::create([
        'provider_id' => $this->provider->id,
        'start_time' => '2026-10-15 10:00:00',
        'end_time' => '2026-10-15 10:30:00',
        'status' => 'available'
    ]);
});

test('a client can successfully book an available time slot', function () {
    $response = $this->actingAs($this->client, 'sanctum')
        ->postJson('/api/appointments', [
            'time_slot_id' => $this->timeSlot->id,
            'service_id' => $this->service->id,
            'notes' => 'Test notes context parameter.'
        ]);

    $response->assertStatus(201);
    
    $this->assertDatabaseHas('appointments', [
        'client_id' => $this->client->id,
        'time_slot_id' => $this->timeSlot->id,
        'status' => 'booked'
    ]);

    $this->assertDatabaseHas('time_slots', [
        'id' => $this->timeSlot->id,
        'status' => 'booked'
    ]);
});

test('a client cannot double book an already occupied time slot', function () {
    // Lock the slot first to simulate an occupied window invariant
    $this->timeSlot->update(['status' => 'booked']);

    $response = $this->actingAs($this->client, 'sanctum')
        ->postJson('/api/appointments', [
            'time_slot_id' => $this->timeSlot->id,
            'service_id' => $this->service->id
        ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['time_slot_id']);
});
