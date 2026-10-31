<?php

use Illuminate\Support\Facades\Schedule;

// Automatically registers our custom reminder command to trigger daily
Schedule::command('app:send-appointment-reminders')->daily();

// Automatically mark missed appointments after the 30-minute grace period
Schedule::command('app:mark-no-show-appointments')->everyMinute();