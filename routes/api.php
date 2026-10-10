<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\TimeSlotController;
use Illuminate\Support\Facades\Route;

// Public authentication routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected Client & Provider workflows
Route::middleware('auth:sanctum')->group(function () {
    
    // Advanced Distance-Aware Marketplace Exploration Engine
    Route::get('/marketplace/explore', [ProviderController::class, 'exploreMarketplace']);

    // Core appointment endpoints (5 total routes now)
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::post('/appointments', [AppointmentController::class, 'store']);
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('/appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
    Route::post('/appointments/{appointment}/no-show', [AppointmentController::class, 'markNoShow']);
    
});
