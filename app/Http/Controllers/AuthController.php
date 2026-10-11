<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Secure registration endpoint. Overrides and drops client-side role/status variables.
     */
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

        $validated['password'] = Hash::make($validated['password']);
        
        // SERVER SIDE ENFORCEMENT: Ignore client input overrides completely
        if ($validated['business_type'] === 'none') {
            $validated['role'] = 'client';
            $validated['status'] = 'approved';
        } else {
            $validated['role'] = 'staff';
            $validated['status'] = 'pending_review'; // Force business accounts into staging state
        }

        $user = User::create($validated);
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

        // SECURITY CHECK: If a business profile is pending review, deny access to dashboards
        if ($user->role === 'staff' && $user->status === 'pending_review') {
            throw ValidationException::withMessages([
                'email' => ['Your business application is currently under review and pending approval.'],
            ]);
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
