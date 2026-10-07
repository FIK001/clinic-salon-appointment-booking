<?php

use App\Models\Provider;
use App\Models\Service;
use App\Models\TimeSlot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

// This forces Laravel to build the tables in-memory before running the test
uses(RefreshDatabase::class);

it('prevents a time slot from being booked twice', function () {
    $client = User::factory()->create(['role' => 'client']);

    $provider = Provider::create([
        'name' => 'Test Provider',
        'email' => 'test-provider@example.com',
        'phone' => '08000000000',
        'specialty' => 'Testing',
        'start_time' => '09:00',
        'end_time' => '17:00',
        'working_days' => ['Mon'],
    ]);

    $service = Service::create([
        'provider_id' => $provider->id,
        'name' => 'Test Service',
        'duration_minutes' => 30,
        'price' => 1000,
    ]);

    $slot = TimeSlot::create([
        'provider_id' => $provider->id,
        'start_time' => now()->addDay(),
        'end_time' => now()->addDay()->addMinutes(30),
        'status' => 'available',
    ]);

    $payload = [
        'time_slot_id' => $slot->id,
        'service_id' => $service->id,
        'notes' => 'First booking',
    ];

    $firstResponse = $this->actingAs($client, 'sanctum')
        ->postJson('/api/appointments', $payload);

    $firstResponse->assertStatus(201);
    $firstResponse->assertJsonPath('status', 'booked');

    expect($slot->fresh()->status)->toBe('booked');

    $secondResponse = $this->actingAs($client, 'sanctum')
        ->postJson('/api/appointments', [
            'time_slot_id' => $slot->id,
            'service_id' => $service->id,
            'notes' => 'Second attempt, should fail',
        ]);

    $secondResponse->assertStatus(422);
    $secondResponse->assertJsonValidationErrors('time_slot_id');

    expect(App\Models\Appointment::where('time_slot_id', $slot->id)->count())->toBe(1);
});

it('allows marking an appointment as a no-show', function () {
    $client = User::factory()->create(['role' => 'client']);
    
    $provider = Provider::create([
        'name' => 'Provider Two',
        'email' => 'provider2@example.com',
        'phone' => '08000000002',
        'specialty' => 'Testing',
        'start_time' => '09:00',
        'end_time' => '17:00',
        'working_days' => ['Mon'],
    ]);

    $service = Service::create([
        'provider_id' => $provider->id,
        'name' => 'Consultation',
        'duration_minutes' => 30,
        'price' => 2000,
    ]);

    $slot = TimeSlot::create([
        'provider_id' => $provider->id,
        'start_time' => now()->addDay(),
        'end_time' => now()->addDay()->addMinutes(30),
        'status' => 'booked',
    ]);

    $appointment = App\Models\Appointment::create([
        'client_id' => $client->id,
        'time_slot_id' => $slot->id,
        'service_id' => $service->id,
        'status' => 'booked',
    ]);

    // Test successful marking as no-show
    $response = $this->actingAs($client, 'sanctum')
        ->postJson("/api/appointments/{$appointment->id}/no-show");

    $response->assertStatus(200);
    $response->assertJsonPath('status', 'no_show');
    expect($appointment->fresh()->status)->toBe('no_show');

    // Test that a cancelled appointment cannot be marked as a no-show
    $appointment->update(['status' => 'cancelled']);

    $failResponse = $this->actingAs($client, 'sanctum')
        ->postJson("/api/appointments/{$appointment->id}/no-show");

    $failResponse->assertStatus(422);
    $failResponse->assertJsonValidationErrors('status');
});
