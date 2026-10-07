<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\TimeSlotController;
use Illuminate\Support\Facades\Route;

// Public authentication routes
Route::post('/login', [AuthController::class, 'login']);

// Aligned correctly to route slot inquiries directly to our dynamic time slot tracking logic
Route::get('/providers/{provider}/slots', [TimeSlotController::class, 'getAvailableSlots']);

// Protected Client & Provider workflows
Route::middleware('auth:sanctum')->group(function () {
    
    // Core appointment endpoints (5 total routes now)
    Route::get('/appointments', [AppointmentController::class, 'index']); // Injected Data Retrieval Hook
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('/appointments/{appointment}/no-show', [AppointmentController::class, 'markNoShow']);
    
});
