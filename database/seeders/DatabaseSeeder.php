<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Provider;
use App\Models\Service;
use App\Models\TimeSlot;
use App\Models\Appointment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use DateTime;
use DateInterval;
use DatePeriod;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Staff/Admin Roles
        User::updateOrCreate(
    ['email' => 'provider@example.com'],
    [
        'name' => 'Dr. Smith',
        'password' => Hash::make('provider1234'),
        'role' => 'staff',
        'address' => 'Ikeja, Lagos',
        'status' => 'approved',
    ]
);
        
        // Clients
       $client1 = User::updateOrCreate(
    ['email' => 'jordan@example.com'],
    [
        'name' => 'Jordan Client',
        'password' => Hash::make('client1234'),
        'role' => 'client',
        'age' => 24,
        'phone_number' => '08155566677',
        'address' => 'Ikorodu, Lagos',
        'status' => 'approved',
    ]
);

$client2 = User::updateOrCreate(
    ['email' => 'david@web18.test'],
    [
        'name' => 'David Adeleke',
        'password' => Hash::make('password123'),
        'role' => 'client',
        'age' => 32,
        'phone_number' => '08122233344',
        'address' => 'Ikeja, Lagos',
        'status' => 'approved',
    ]
);
        // CLINIC PROVIDERS SECTOR
$p1 = Provider::updateOrCreate(
    ['email' => 'tunde@web18care.test'],
    ['name' => 'Dr. Tunde Faniyi (Ikorodu Medical Centre)', 'phone' => '08030000001', 'specialty' => 'GP', 'address' => 'Ikorodu, Lagos', 'bio' => 'General practitioner.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]
);

$p2 = Provider::updateOrCreate(
    ['email' => 'amaka@web18care.test'],
    ['name' => 'Dr. Amaka Obi (Ikeja Plaza)', 'phone' => '08030000002', 'specialty' => 'GP', 'address' => 'Ikeja, Lagos', 'bio' => 'Family diagnostics.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]
);

$p3 = Provider::updateOrCreate(
    ['email' => 'chioma@web18care.test'],
    ['name' => 'Dr. Chioma Nwachukwu (Lekki Centre)', 'phone' => '08030000003', 'specialty' => 'GP', 'address' => 'Lekki, Lagos', 'bio' => 'Premium consultant.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]
);

// SALON PROVIDERS SECTOR
$p4 = Provider::updateOrCreate(
    ['email' => 'segun@web18salon.test'],
    ['name' => 'Segun Barber (Opebi Fades)', 'phone' => '08030000004', 'specialty' => 'Barber', 'address' => 'Opebi, Lagos', 'bio' => 'Master barber cutting expert.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]
);

$p5 = Provider::updateOrCreate(
    ['email' => 'clara@web18salon.test'],
    ['name' => 'Clara Nails (VI Luxury Salon)', 'phone' => '08030000005', 'specialty' => 'Nail Technician', 'address' => 'Victoria Island, Lagos', 'bio' => 'Nail therapy specialist.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]
);
        
        // Services mapping
        $s1 = Service::updateOrCreate(
    ['provider_id' => $p1->id, 'name' => 'Consultation'],
    ['duration_minutes' => 30, 'price' => 5000]
);

$s2 = Service::updateOrCreate(
    ['provider_id' => $p2->id, 'name' => 'Consultation'],
    ['duration_minutes' => 30, 'price' => 5000]
);

$s3 = Service::updateOrCreate(
    ['provider_id' => $p3->id, 'name' => 'Consultation'],
    ['duration_minutes' => 30, 'price' => 5000]
);

$s4 = Service::updateOrCreate(
    ['provider_id' => $p4->id, 'name' => 'Haircut'],
    ['duration_minutes' => 30, 'price' => 3000]
);

$s5 = Service::updateOrCreate(
    ['provider_id' => $p5->id, 'name' => 'Manicure'],
    ['duration_minutes' => 30, 'price' => 6000]
);

        // GENERATE EVERY WEEKDAY SLOTS AUTOMATICALLY FOR A FULL MONTH
$begin = new DateTime('2026-11-01');
$end = new DateTime('2027-02-01');
$interval = new DateInterval('P1D');
$period = new DatePeriod($begin, $interval, $end);

$times = ['09:30:00', '11:00:00', '13:30:00', '15:00:00', '16:30:00'];
$providers = [$p1, $p2, $p3, $p4, $p5];
$clients = [$client1, $client2];

foreach ($period as $dt) {
    if (in_array((int) $dt->format('N'), [1, 2, 3, 4, 5])) {
        $dateStr = $dt->format('Y-m-d');

        foreach ($times as $time) {
            foreach ($providers as $prov) {
                $startTime = "{$dateStr} {$time}";
                $endTime = date(
                    'Y-m-d H:i:s',
                    strtotime("{$startTime} +30 minutes")
                );

                $slot = TimeSlot::firstOrCreate(
                    [
                        'provider_id' => $prov->id,
                        'start_time' => $startTime,
                    ],
                    [
                        'end_time' => $endTime,
                        'status' => 'available',
                    ]
                );
            }
        }
    }
}
}
}