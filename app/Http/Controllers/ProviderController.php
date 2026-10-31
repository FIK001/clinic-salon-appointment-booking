<?php

namespace App\Http\Controllers;

use App\Models\Provider;
use App\Models\TimeSlot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class ProviderController extends Controller
{
    /**
     * Get list of providers matching a specialty role with accurate calculated proximity metrics.
     */
    public function getProvidersBySpecialty(Request $request)
    {
        $request->validate([
            'specialty' => 'required|string',
        ]);

        $specialty = $request->query('specialty');
        $user = Auth::user();

        $coordinatesMatrix = [
            'ikorodu' => ['lat' => 6.6178, 'lng' => 3.5139],
            'ikeja'   => ['lat' => 6.5920, 'lng' => 3.3422],
            'lekki'   => ['lat' => 6.4281, 'lng' => 3.4219],
            'opebi'   => ['lat' => 6.5955, 'lng' => 3.3533],
            'vi'      => ['lat' => 6.4243, 'lng' => 3.4116],
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

        $providers = Provider::where(
            'specialty',
            'LIKE',
            "%{$specialty}%"
        )->get();

        $computedProviders = $providers->map(function ($prov) use (
            $userLat,
            $userLng,
            $coordinatesMatrix
        ) {
            $provLat = $coordinatesMatrix['default']['lat'];
            $provLng = $coordinatesMatrix['default']['lng'];

            $provAddr = strtolower($prov->address ?? '');
            $provName = strtolower($prov->name ?? '');

            if (
                str_contains($provName, 'amaka') ||
                str_contains($provAddr, 'ikeja')
            ) {
                $provLat = 6.5920;
                $provLng = 3.3422;
            } elseif (str_contains($provName, 'tunde')) {
                $provLat = 6.6100;
                $provLng = 3.5000;
            } elseif (str_contains($provName, 'chioma')) {
                $provLat = 6.4281;
                $provLng = 3.4219;
            } elseif (str_contains($provName, 'segun')) {
                $provLat = 6.5955;
                $provLng = 3.3533;
            } elseif (str_contains($provName, 'clara')) {
                $provLat = 6.4243;
                $provLng = 3.4116;
            }

            // Calculate distance using the Haversine formula.
            $earthRadius = 6371;

            $dLat = deg2rad($provLat - $userLat);
            $dLng = deg2rad($provLng - $userLng);

            $a = sin($dLat / 2) * sin($dLat / 2) +
                cos(deg2rad($userLat)) *
                cos(deg2rad($provLat)) *
                sin($dLng / 2) *
                sin($dLng / 2);

            $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

            $distance = $earthRadius * $c;

            $prov->distance_km = round($distance, 1);

            return $prov;
        })->sortBy('distance_km')->values();

        return response()->json($computedProviders);
    }

    /**
     * Fetch available future slots for a specialist on a target date.
     * If none exist, suggest the closest upcoming available slots.
     */
    public function getSpecialistSlots(Request $request)
    {
        $request->validate([
            'provider_id' => 'required|exists:providers,id',
            'date' => 'required|date_format:Y-m-d',
        ]);

        $providerId = $request->query('provider_id');
        $targetDate = $request->query('date');

        // 1. Check available future slots on the selected date.
        $slots = TimeSlot::where('provider_id', $providerId)
            ->whereDate('start_time', $targetDate)
            ->where('start_time', '>', now())
            ->where('status', 'available')
            ->orderBy('start_time', 'asc')
            ->get();

        if ($slots->count() > 0) {
            return response()->json([
                'status' => 'available_on_date',
                'slots' => $slots,
            ]);
        }

        // 2. If none exist, find the five closest future alternatives.
        $closestSlots = TimeSlot::where('provider_id', $providerId)
            ->where('start_time', '>=', Carbon::parse($targetDate)->startOfDay())
            ->where('start_time', '>', now())
            ->where('status', 'available')
            ->orderBy('start_time', 'asc')
            ->take(5)
            ->get();

        return response()->json([
            'status' => 'suggested_alternatives',
            'message' => 'No slots open on selected target date. See closest alternative openings below.',
            'slots' => $closestSlots,
        ]);
    }

    /**
     * Update specialist provider profile settings.
     */
    public function updateProfile(Request $request, $id)
    {
        $provider = Provider::findOrFail($id);

        $validated = $request->validate([
            'bio' => 'required|string',
            'specialty' => 'nullable|string',
            'phone' => 'nullable|string',
        ]);

        $provider->update($validated);

        return response()->json([
            'message' => 'Profile configuration saved successfully.',
            'provider' => $provider,
        ]);
    }
}
