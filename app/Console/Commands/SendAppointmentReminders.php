<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendAppointmentReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:send-appointment-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Find appointments starting in the next 24 hours and send reminders';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Scanning for upcoming appointments requiring reminders...');

        // Find active appointments starting between now and 24 hours from now
        $upcomingAppointments = Appointment::where('status', 'booked')
            ->whereHas('time_slot', function ($query) {
                $query->where('start_time', '>=', now())
                      ->where('start_time', '<=', now()->addHours(24));
            })
            ->with(['client', 'time_slot', 'service'])
            ->get();

        if ($upcomingAppointments->isEmpty()) {
            $this->info('No upcoming appointments found for the next 24 hours.');
            return Command::SUCCESS;
        }

        $count = 0;
        foreach ($upcomingAppointments as $appointment) {
            // Log a clean record for each reminder (Simulating email/SMS dispatch for now)
            Log::info("Reminder Queue: Dispatching notification to Client [{$appointment->client->name}] ({$appointment->client->email}) for appointment ID {$appointment->id} scheduled at {$appointment->time_slot->start_time}.");
            $count++;
        }

        $this->info("Successfully processed and logged {$count} appointment reminder(s).");
        return Command::SUCCESS;
    }
}
