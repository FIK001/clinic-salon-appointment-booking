
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Appointment Cancellation</title>
</head>
<body style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">

    <h2>Appointment Cancellation Confirmed</h2>

    <p>Hello {{ $appointment->client->name ?? 'Valued Client' }},</p>

    <p>Your appointment cancellation has been successfully processed.</p>

    <p>
        <strong>Appointment ID:</strong> #{{ $appointment->id }}<br>
        <strong>Practitioner:</strong>
        {{ $appointment->time_slot->provider->name ?? 'Not specified' }}<br>
        <strong>Service:</strong> {{ $appointment->service->name ?? 'Appointment' }}<br>
        <strong>Date:</strong>
        {{ $appointment->time_slot->start_time->format('l, d F Y') }}<br>
        <strong>Time:</strong>
        {{ $appointment->time_slot->start_time->format('h:i A') }}<br>
        <strong>Status:</strong> Cancelled
    </p>

    <p>If you wish to book another appointment, please visit our application.</p>

    <p>
        Regards,<br>
        {{ config('app.name') }}
    </p>

</body>
</html>
