
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Appointment Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">

    <h2>Your Appointment Is Confirmed!</h2>

    <p>Hello {{ $appointment->client->name ?? 'Valued Client' }},</p>

    <p>
        Your appointment has been successfully booked.
        Here are your appointment details:
    </p>

    <p>
        <strong>Appointment ID:</strong> #{{ $appointment->id }}<br>
        <strong>Practitioner:</strong>
        {{ $appointment->time_slot->provider->name ?? 'Not specified' }}<br>
        <strong>Service:</strong> {{ $appointment->service->name ?? 'Appointment' }}<br>
        <strong>Date:</strong> {{ $appointment->time_slot->start_time->format('l, d F Y') }}<br>
        <strong>Time:</strong> {{ $appointment->time_slot->start_time->format('h:i A') }}<br>
        <strong>Status:</strong> Confirmed
    </p>

    <p>
        Please arrive a few minutes before your scheduled appointment.
    </p>

    <p>Thank you for choosing us.</p>

    <p>
        Regards,<br>
        {{ config('app.name') }}
    </p>

</body>
</html>
