<?php

use Illuminate\Support\Facades\Route;

// Catch all web traffic and pass it over to the React root layout view
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');
