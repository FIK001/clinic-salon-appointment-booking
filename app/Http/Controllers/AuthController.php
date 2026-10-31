<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'phone_number' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'age' => 'nullable|integer|min:1',
            'business_type' => 'required|in:clinic,salon,none',
        ]);

        // role and status are decided here on the server, never taken from the request
        $isBusiness = $validated['business_type'] !== 'none';

        $user = User::forceCreate([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone_number' => $validated['phone_number'] ?? null,
            'address' => $validated['address'] ?? null,
            'age' => $isBusiness ? null : ($validated['age'] ?? null),
            'business_type' => $validated['business_type'],
            'role' => $isBusiness ? 'staff' : 'client',
            'status' => $isBusiness ? 'pending_review' : 'approved',
        ]);

        // Pending businesses get NO token until they are approved
        if ($isBusiness) {
            return response()->json([
                'message' => 'Application received. Your business is pending review.',
                'user' => $user->only('id', 'name', 'email', 'role', 'business_type', 'status'),
            ], 201);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user->only('id', 'name', 'email', 'role', 'business_type', 'status'),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->role === 'staff' && $user->status !== 'approved') {
            $message = $user->status === 'rejected'
                ? 'Your business application was not approved.'
                : 'Your business application is currently under review and pending approval.';

            throw ValidationException::withMessages(['email' => [$message]]);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user' => $user->only('id', 'name', 'email', 'role', 'business_type', 'status'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }
}