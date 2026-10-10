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
        User::create(['name' => 'Dr. Smith', 'email' => 'provider@example.com', 'password' => Hash::make('provider1234'), 'role' => 'staff', 'address' => 'Ikeja, Lagos', 'status' => 'approved']);
        
        // Clients
        $client1 = User::create(['name' => 'Jordan Client', 'email' => 'jordan@example.com', 'password' => Hash::make('client1234'), 'role' => 'client', 'age' => 24, 'phone_number' => '08155566677', 'address' => 'Ikorodu, Lagos']);
        $client2 = User::create(['name' => 'David Adeleke', 'email' => 'david@web18.test', 'password' => Hash::make('password123'), 'role' => 'client', 'age' => 32, 'phone_number' => '08122233344', 'address' => 'Ikeja, Lagos']);

        // CLINIC PROVIDERS SECTOR
        $p1 = Provider::create(['name' => 'Dr. Tunde Faniyi (Ikorodu Medical Centre)', 'email' => 'tunde@web18care.test', 'phone' => '08030000001', 'specialty' => 'GP', 'address' => 'Ikorodu, Lagos', 'bio' => 'General practitioner.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]);
        $p2 = Provider::create(['name' => 'Dr. Amaka Obi (Ikeja Plaza)', 'email' => 'amaka@web18care.test', 'phone' => '08030000002', 'specialty' => 'GP', 'address' => 'Ikeja, Lagos', 'bio' => 'Family diagnostics.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]);
        $p3 = Provider::create(['name' => 'Dr. Chioma Nwachukwu (Lekki Centre)', 'email' => 'chioma@web18care.test', 'phone' => '08030000003', 'specialty' => 'GP', 'address' => 'Lekki, Lagos', 'bio' => 'Premium consultant.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]);

        // SALON PROVIDERS SECTOR
        $p4 = Provider::create(['name' => 'Segun Barber (Opebi Fades)', 'email' => 'segun@web18salon.test', 'phone' => '08030000004', 'specialty' => 'Barber', 'address' => 'Opebi, Lagos', 'bio' => 'Master barber cutting expert.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]);
        $p5 = Provider::create(['name' => 'Clara Nails (VI Luxury Salon)', 'email' => 'clara@web18salon.test', 'phone' => '08030000005', 'specialty' => 'Nail Technician', 'address' => 'Victoria Island, Lagos', 'bio' => 'Nail therapy specialist.', 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'working_days' => ['Mon','Tue','Wed','Thu','Fri']]);

        // Services mapping
        $s1 = Service::create(['provider_id' => $p1->id, 'name' => 'Consultation', 'duration_minutes' => 30, 'price' => 5000]);
        $s2 = Service::create(['provider_id' => $p2->id, 'name' => 'Consultation', 'duration_minutes' => 30, 'price' => 5000]);
        $s3 = Service::create(['provider_id' => $p3->id, 'name' => 'Consultation', 'duration_minutes' => 30, 'price' => 5000]);
        $s4 = Service::create(['provider_id' => $p4->id, 'name' => 'Haircut', 'duration_minutes' => 30, 'price' => 3000]);
        $s5 = Service::create(['provider_id' => $p5->id, 'name' => 'Manicure', 'duration_minutes' => 30, 'price' => 6000]);

        // GENERATE EVERY WEEKDAY SLOTS AUTOMATICALLY FOR A FULL MONTH
        $begin = new DateTime('2026-10-01');
        $end = new DateTime('2026-11-01');
        $interval = new DateInterval('P1D');
        $period = new DatePeriod($begin, $interval, $end);

        $times = ['09:30:00', '11:00:00', '13:30:00', '15:00:00', '16:30:00'];
        $providers = [$p1, $p2, $p3, $p4, $p5];
        $clients = [$client1, $client2];
        $statuses = ['booked', 'cancelled', 'no_show'];

        foreach ($period as $dt) {
            if (in_array($dt->format('N'), [1, 2, 3, 4, 5])) {
                $dateStr = $dt->format('Y-m-d');
                
                foreach ($times as $time) {
                    foreach ($providers as $prov) {
                        $slot = TimeSlot::create([
                            'provider_id' => $prov->id,
                            'start_time' => "{$dateStr} {$time}",
                            'end_time' => date('Y-m-d H:i:s', strtotime("{$dateStr} {$time} +30 minutes")),
                            'status' => 'available',
                        ]);

                        // AUTOMATICALLY CLAIM A PORTION OF THE TIME SLOTS AS SIMULATED APPOINTMENTS
                        if (rand(1, 12) === 1) {
                            $slot->update(['status' => 'booked']);
                            $randomClient = $clients[array_rand($clients)];
                            
                            $srv = Service::where('provider_id', $prov->id)->first();

                            Appointment::create([
                                'client_id' => $randomClient->id,
                                'time_slot_id' => $slot->id,
                                'service_id' => $srv->id,
                                'status' => $statuses[array_rand($statuses)],
                                'notes' => 'Patient requested general wellness evaluation.',
                                'consultation_report' => null
                            ]);
                        }
                    }
                }
            }
        }
    }
}
