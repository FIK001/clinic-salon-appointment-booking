<?php

use Illuminate\Support\Facades\Schedule;

// Automatically registers our custom reminder command to trigger daily
Schedule::command('app:send-appointment-reminders')->daily();
