<?php

namespace Database\Seeders;

use App\Models\Provider;
use App\Models\Service;
use App\Models\TimeSlot;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::forceCreate([
            'name' => 'Front Desk',
            'email' => 'staff@web18care.test',
            'password' => Hash::make('staff1234'),
            'role' => 'staff',
        ]);

        User::forceCreate([
            'name' => 'Jordan Client',
            'email' => 'jordan@example.com',
            'password' => Hash::make('client1234'),
            'role' => 'client',
        ]);

        $providers = [
            [
                'name' => 'Dr. Amaka Obi',
                'email' => 'amaka@web18care.test',
                'phone' => '08030000001',
                'specialty' => 'Family Medicine',
                'bio' => 'General practitioner with 10 years of experience.',
                'start_time' => '09:00',
                'end_time' => '17:00',
                'working_days' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                'services' => [
                    ['General Consultation', 30, 5000],
                    ['Follow-up Visit', 30, 3000],
                ],
            ],
            [
                'name' => 'Dr. Tunde Bello',
                'email' => 'tunde@web18care.test',
                'phone' => '08030000002',
                'specialty' => 'Dermatology',
                'bio' => 'Skin care specialist.',
                'start_time' => '10:00',
                'end_time' => '16:00',
                'working_days' => ['Mon', 'Wed', 'Fri'],
                'services' => [
                    ['Skin Consultation', 30, 8000],
                    ['Acne Treatment', 60, 15000],
                ],
            ],
            [
                'name' => 'Ada Nwosu',
                'email' => 'ada@web18care.test',
                'phone' => '08030000003',
                'specialty' => 'Hair',
                'bio' => 'Stylist specialising in braids and natural hair.',
                'start_time' => '09:00',
                'end_time' => '18:00',
                'working_days' => ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                'services' => [
                    ['Braiding', 120, 12000],
                    ['Hair Wash and Style', 60, 6000],
                ],
            ],
            [
                'name' => 'Zainab Musa',
                'email' => 'zainab@web18care.test',
                'phone' => '08030000004',
                'specialty' => 'Spa',
                'bio' => 'Massage and spa therapist.',
                'start_time' => '11:00',
                'end_time' => '19:00',
                'working_days' => ['Thu', 'Fri', 'Sat', 'Sun'],
                'services' => [
                    ['Full Body Massage', 60, 20000],
                    ['Facial', 45, 10000],
                ],
            ],
        ];

        foreach ($providers as $data) {
            $services = $data['services'];
            unset($data['services']);

            $provider = Provider::create($data);

            foreach ($services as [$name, $duration, $price]) {
                Service::create([
                    'provider_id' => $provider->id,
                    'name' => $name,
                    'duration_minutes' => $duration,
                    'price' => $price,
                ]);
            }

            // Generate 30-minute slots for the next 7 days
            for ($i = 1; $i <= 7; $i++) {
                $day = Carbon::today()->addDays($i);

                if (! in_array($day->format('D'), $provider->working_days)) {
                    continue;
                }

                $cursor = Carbon::parse($day->toDateString().' '.$provider->start_time);
                $close = Carbon::parse($day->toDateString().' '.$provider->end_time);

                while ($cursor->copy()->addMinutes(30)->lte($close)) {
                    TimeSlot::create([
                        'provider_id' => $provider->id,
                        'start_time' => $cursor->copy(),
                        'end_time' => $cursor->copy()->addMinutes(30),
                        'status' => 'available',
                    ]);
                    $cursor->addMinutes(30);
                }
            }
        }
    }
}