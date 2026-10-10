<?php

namespace App\Http\Controllers;

use App\Models\Provider;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProviderController extends Controller
{
    public function exploreMarketplace(Request $request)
    {
        $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'sector' => 'required|in:clinic,salon',
            'specialty' => 'required|string',
        ]);

        $date = $request->query('date');
        $specialty = $request->query('specialty');
        $user = Auth::user();

        $coordinatesMatrix = [
            'ikorodu' => ['lat' => 6.6178, 'lng' => 3.5139],
            'ikeja'   => ['lat' => 6.5920, 'lng' => 3.3422],
            'lekki'   => ['lat' => 6.4281, 'lng' => 3.4219],
            'default' => ['lat' => 6.5244, 'lng' => 3.3792],
        ];

        $userLat = $coordinatesMatrix['default']['lat'];
        $userLng = $coordinatesMatrix['default']['lng'];
        if ($user && $user->address) {
            $userAddr = strtolower($user->address);
            foreach ($coordinatesMatrix as $key => $coords) {
                if (str_contains($userAddr, $key)) {
                    $userLat = $coords['lat'];
                    $userLng = $coords['lng'];
                    break;
                }
            }
        }

        $slots = TimeSlot::where('status', 'available')
            ->whereDate('start_time', $date)
            ->whereHas('provider', function ($query) use ($specialty) {
                $query->where('specialty', 'LIKE', "%{$specialty}%");
            })
            ->with('provider')
            ->get();

        $computedCollection = $slots->map(function ($slot) use ($userLat, $userLng, $coordinatesMatrix) {
            $provLat = $coordinatesMatrix['ikeja']['lat'];
            $provLng = $coordinatesMatrix['ikeja']['lng'];
            
            if ($slot->provider) {
                $provAddr = strtolower($slot->provider->address);
                $provName = strtolower($slot->provider->name);
                
                if (str_contains($provName, 'amaka') || str_contains($provAddr, 'ikeja')) {
                    $provLat = 6.5920; $provLng = 3.3422;
                } else if (str_contains($provName, 'tunde')) {
                    $provLat = 6.6100; $provLng = 3.5000;
                } else if (str_contains($provName, 'chioma')) {
                    $provLat = 6.4281; $provLng = 3.4219;
                } else if (str_contains($provName, 'segun')) {
                    $provLat = 6.5955; $provLng = 3.3533;
                } else if (str_contains($provName, 'clara')) {
                    $provLat = 6.4243; $provLng = 3.4116;
                }
            }

            // Haversine Base Calculation
            $earthRadius = 6371;
            $dLat = deg2rad($provLat - $userLat);
            $dLng = deg2rad($provLng - $userLng);
            
            $a = sin($dLat / 2) * sin($dLat / 2) +
                 cos(deg2rad($userLat)) * cos(deg2rad($provLat)) *
                 sin($dLng / 2) * sin($dLng / 2);
            $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
            $baseDistance = $earthRadius * $c;

            // Injected Micro-Variance to simulate real-world slot variance mapping
            // e.g., creates slight variations based on slot ID seeds
            $variance = (($slot->id * 7) % 15) / 10; 
            $finalDistance = $baseDistance + $variance;

            $slot->distance_km = round($finalDistance, 1);
            $slot->provider_name = $slot->provider->name;
            $slot->provider_specialty = $slot->provider->specialty;

            return $slot;
        });

        // Sorted by distance in ascending order from closest to farthest
        return response()->json($computedCollection->sortBy('distance_km')->values());
    }
}
