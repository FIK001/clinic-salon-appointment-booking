<?php

namespace App\Http\Controllers;

use App\Models\Provider;
use App\Models\Service;
use App\Models\TimeSlot;
use App\Services\AppointmentSlotService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProviderController extends Controller
{
    /**
     * Get list of providers matching a specialty role
     * with calculated proximity metrics.
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
     * Retrieve services offered by a selected provider.
     */
    public function getProviderServices($id)
    {
        $provider = Provider::findOrFail($id);

        $services = Service::where('provider_id', $provider->id)
            ->select(
                'id',
                'provider_id',
                'name',
                'description',
                'duration_minutes',
                'price'
            )
            ->orderBy('name')
            ->get();

        return response()->json([
            'provider_id' => $provider->id,
            'services' => $services,
        ]);
    }

    /**
     * Generate and retrieve available appointment slots
     * based on provider schedule and selected service.
     */
    public function getSpecialistSlots(
        Request $request,
        AppointmentSlotService $slotService
    ) {
        $validated = $request->validate([
            'provider_id' => 'required|exists:providers,id',
            'service_id' => 'required|exists:services,id',
            'date' => 'required|date_format:Y-m-d|after_or_equal:today',
        ]);

        $provider = Provider::findOrFail($validated['provider_id']);

        $service = Service::findOrFail($validated['service_id']);

        if ((int) $service->provider_id !== (int) $provider->id) {
            return response()->json([
                'message' => 'The selected service does not belong to this provider.',
            ], 422);
        }

        $slots = $slotService->generate(
            $provider,
            $service,
            $validated['date']
        );

        if ($slots->isNotEmpty()) {
            return response()->json([
                'status' => 'available_on_date',
                'provider_id' => $provider->id,
                'service_id' => $service->id,
                'service_duration' => $service->duration_minutes,
                'slots' => $slots,
            ]);
        }

        return response()->json([
            'status' => 'no_availability',
            'message' => 'No suitable appointment slots are available on the selected date.',
            'slots' => [],
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
