<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:mark-no-show-appointments')]
#[Description('Automatically marks appointments as no-show after a 30-minute grace period')]
class MarkNoShowAppointments extends Command
{
    public function handle()
    {
        $cutoffTime = now()->subMinutes(30);

        $updatedCount = Appointment::where('status', 'booked')
            ->whereHas('time_slot', function ($query) use ($cutoffTime) {
                $query->where('start_time', '<=', $cutoffTime);
            })
            ->update([
                'status' => 'no_show',
            ]);

        $this->info("Successfully marked {$updatedCount} appointment(s) as no-show.");

        return Command::SUCCESS;
    }
}