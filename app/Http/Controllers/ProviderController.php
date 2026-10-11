<?php

namespace App\Http\Controllers;

use App\Models\Provider;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProviderController extends Controller
{
    /**
     * Fetch available slots with accurate area-level geometric distance calculations.
     * Distance computations are deterministic based on area keywords.
     */
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

        // Area-level coordinate mappings for specific regions across Lagos state
        $coordinatesMatrix = [
            'ikorodu' => ['lat' => 6.6178, 'lng' => 3.5139],
            'ikeja'   => ['lat' => 6.5920, 'lng' => 3.3422],
            'lekki'   => ['lat' => 6.4281, 'lng' => 3.4219],
            'opebi'   => ['lat' => 6.5955, 'lng' => 3.3533],
            'vi'      => ['lat' => 6.4243, 'lng' => 3.4116],
            'default' => ['lat' => 6.5244, 'lng' => 3.3792],
        ];

        // Fallback reference point if user address is missing or contains unknown keywords
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
            $provLat = $coordinatesMatrix['default']['lat'];
            $provLng = $coordinatesMatrix['default']['lng'];
            
            if ($slot->provider) {
                $provAddr = strtolower($slot->provider->address);
                foreach ($coordinatesMatrix as $key => $coords) {
                    if (str_contains($provAddr, $key)) {
                        $provLat = $coords['lat'];
                        $provLng = $coords['lng'];
                        break;
                    }
                }
            }

            // Haversine Formula: Deterministic distance computation with zero pseudo-random offsets
            $earthRadius = 6371; // Radius of the Earth in kilometers
            $dLat = deg2rad($provLat - $userLat);
            $dLng = deg2rad($provLng - $userLng);
            
            $a = sin($dLat / 2) * sin($dLat / 2) +
                 cos(deg2rad($userLat)) * cos(deg2rad($provLat)) *
                 sin($dLng / 2) * sin($dLng / 2);
            $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
            $distance = $earthRadius * $c;

            $slot->distance_km = round($distance, 1);
            $slot->provider_name = $slot->provider->name;
            $slot->provider_specialty = $slot->provider->specialty;

            return $slot;
        });

        return response()->json($computedCollection->sortBy('distance_km')->values());
    }
}
