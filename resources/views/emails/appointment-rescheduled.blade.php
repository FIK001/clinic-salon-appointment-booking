<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Appointment Rescheduled</title>
</head>
<body style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">

    <h2>Your Appointment Has Been Rescheduled</h2>

    <p>Hello {{ $appointment->client->name ?? 'Valued Client' }},</p>

    <p>Your appointment has been successfully rescheduled.</p>

    <p>
        <strong>Appointment ID:</strong> #{{ $appointment->id }}<br>
        <strong>Practitioner:</strong>
        {{ $appointment->time_slot->provider->name ?? 'Not specified' }}<br>
        <strong>Service:</strong> {{ $appointment->service->name ?? 'Appointment' }}
    </p>

    <h3>Previous Appointment</h3>
    <p>
        {{ $previousDate }}<br>
        {{ $previousTime }}
    </p>

    <h3>New Appointment</h3>
    <p>
        {{ $appointment->time_slot->start_time->format('l, d F Y') }}<br>
        {{ $appointment->time_slot->start_time->format('h:i A') }}
    </p>

    <p><strong>Status:</strong> Confirmed</p>

    <p>Please arrive a few minutes before your new appointment time.</p>

    <p>
        Regards,<br>
        {{ config('app.name') }}
    </p>

</body>
</html>
