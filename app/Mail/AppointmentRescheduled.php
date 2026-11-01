<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentRescheduled extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Appointment $appointment;
    public string $previousDate;
    public string $previousTime;

    public function __construct(
        Appointment $appointment,
        string $previousDate,
        string $previousTime
    ) {
        $this->appointment = $appointment;
        $this->previousDate = $previousDate;
        $this->previousTime = $previousTime;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Appointment Has Been Rescheduled'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.appointment-rescheduled'
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
