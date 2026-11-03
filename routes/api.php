<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\ProviderScheduleController;
use Illuminate\Support\Facades\Route;

// Public authentication routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {

    // Staff schedule management
    Route::get('/staff/schedule', [ProviderScheduleController::class, 'show']);
    Route::put('/staff/schedule', [ProviderScheduleController::class, 'update']);

    // Provider marketplace
    Route::get('/marketplace/specialists', [ProviderController::class, 'getProvidersBySpecialty']);
    Route::get('/marketplace/slots', [ProviderController::class, 'getSpecialistSlots']);

    // Retrieve services offered by a provider
    Route::get('/marketplace/providers/{id}/services', [ProviderController::class, 'getProviderServices']);

    // Update provider profile
    Route::post('/marketplace/providers/{id}/update', [ProviderController::class, 'updateProfile']);

    // Appointment management
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::post('/appointments/save-report', [AppointmentController::class, 'saveReport']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('/appointments/{appointment}/no-show', [AppointmentController::class, 'markNoShow']);
    Route::post('/appointments/{appointment}/complete', [AppointmentController::class, 'markCompleted']);

});
