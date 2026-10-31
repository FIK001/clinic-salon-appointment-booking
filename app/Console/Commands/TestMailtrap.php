<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestMailtrap extends Command
{
    protected $signature = 'mailtrap:test';

    protected $description = 'Send a test email to Mailtrap';

    public function handle(): int
    {
        try {
            Mail::raw(
                'Mailtrap is connected to my Laravel booking application.',
                function ($message) {
                    $message->to('test@example.com')
                        ->subject('Laravel Mailtrap Test');
                }
            );

            $this->info('Test email sent to the configured mail service.');

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Email failed: ' . $e->getMessage());

            return self::FAILURE;
        }
    }
}
