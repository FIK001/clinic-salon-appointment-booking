<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProviderController;
use Illuminate\Support\Facades\Route;

// Public authentication routes
Route::post('/login', [AuthController::class, 'login']);

// Public provider and slot availability exploration
Route::get('/providers/{provider}/slots', [ProviderController::class, 'availableSlots']);

// Protected Client & Provider workflows
Route::middleware('auth:sanctum')->group(function () {
    
    // Core appointment endpoints (4 total routes)
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('/appointments/{appointment}/no-show', [AppointmentController::class, 'markNoShow']);
    
});
