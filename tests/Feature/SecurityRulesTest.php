<?php

use App\Models\Appointment;
use App\Models\Service;
use App\Models\TimeSlot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed();

    $this->slot = TimeSlot::where('status', 'available')->first();
    $this->service = Service::where('provider_id', $this->slot->provider_id)->first();

    $this->owner = User::factory()->create([
        'role' => 'client', 'status' => 'approved', 'business_type' => 'none',
    ]);
    $this->stranger = User::factory()->create([
        'role' => 'client', 'status' => 'approved', 'business_type' => 'none',
    ]);

    $this->appointment = Appointment::create([
        'client_id' => $this->owner->id,
        'time_slot_id' => $this->slot->id,
        'service_id' => $this->service->id,
        'status' => 'booked',
    ]);
    $this->slot->update(['status' => 'booked']);
});

it('stops a client cancelling someone else\'s appointment', function () {
    $this->actingAs($this->stranger, 'sanctum')
        ->postJson("/api/appointments/{$this->appointment->id}/cancel")
        ->assertStatus(403);

    expect($this->appointment->fresh()->status)->toBe('booked');
});

it('stops a client rescheduling someone else\'s appointment', function () {
    $otherSlot = TimeSlot::where('status', 'available')
        ->where('provider_id', $this->slot->provider_id)
        ->first();

    $this->actingAs($this->stranger, 'sanctum')
        ->postJson("/api/appointments/{$this->appointment->id}/reschedule", [
            'time_slot_id' => $otherSlot->id,
        ])
        ->assertStatus(403);

    expect($this->appointment->fresh()->time_slot_id)->toBe($this->slot->id);
});

it('stops a client marking a no-show', function () {
    $this->actingAs($this->owner, 'sanctum')
        ->postJson("/api/appointments/{$this->appointment->id}/no-show")
        ->assertStatus(403);

    expect($this->appointment->fresh()->status)->toBe('booked');
});

it('lets approved staff mark a booked appointment as a no-show', function () {
    $staff = User::factory()->create([
        'role' => 'staff', 'status' => 'approved', 'business_type' => 'clinic',
    ]);

    $this->actingAs($staff, 'sanctum')
        ->postJson("/api/appointments/{$this->appointment->id}/no-show")
        ->assertOk();

    expect($this->appointment->fresh()->status)->toBe('no_show');
});

it('stops a pending business marking a no-show', function () {
    $pending = User::factory()->create([
        'role' => 'staff', 'status' => 'pending_review', 'business_type' => 'clinic',
    ]);

    $this->actingAs($pending, 'sanctum')
        ->postJson("/api/appointments/{$this->appointment->id}/no-show")
        ->assertStatus(403);

    expect($this->appointment->fresh()->status)->toBe('booked');
});

it('rejects a service that belongs to a different provider', function () {
    $freeSlot = TimeSlot::where('status', 'available')->first();
    $wrongService = Service::where('provider_id', '!=', $freeSlot->provider_id)->first();

    $this->actingAs($this->owner, 'sanctum')
        ->postJson('/api/appointments', [
            'time_slot_id' => $freeSlot->id,
            'service_id' => $wrongService->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('service_id');

    expect($freeSlot->fresh()->status)->toBe('available');
});

it('ignores role and status sent by the browser when registering', function () {
    $this->postJson('/api/register', [
        'name' => 'Sneaky',
        'email' => 'sneaky@example.com',
        'password' => 'password123',
        'business_type' => 'none',
        'role' => 'staff',
        'status' => 'approved',
    ])->assertStatus(201);

    expect(User::where('email', 'sneaky@example.com')->first()->role)->toBe('client');
});

it('gives a registering business no token and keeps it pending', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Apex Clinic',
        'email' => 'apex@example.com',
        'password' => 'password123',
        'business_type' => 'clinic',
        'role' => 'staff',
        'status' => 'approved',
    ]);

    $response->assertStatus(201);
    expect($response->json('token'))->toBeNull();
    expect(User::where('email', 'apex@example.com')->first()->status)->toBe('pending_review');
});

it('stops a pending business logging in', function () {
    $this->postJson('/api/register', [
        'name' => 'Apex Clinic',
        'email' => 'apex@example.com',
        'password' => 'password123',
        'business_type' => 'clinic',
    ]);

    $this->postJson('/api/login', [
        'email' => 'apex@example.com',
        'password' => 'password123',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
});