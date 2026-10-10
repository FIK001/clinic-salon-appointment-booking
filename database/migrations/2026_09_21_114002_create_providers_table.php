<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('providers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone');
            
            // Flexible specialities field to hold custom clusters (e.g. Neurologist, Barber, Dentist)
            $table->string('specialty');
            
            // Physical location column enabling Haversine distance-aware recommendation lookups
            $table->text('address')->nullable();
            
            $table->text('bio')->nullable();
            $table->time('start_time');
            $table->time('end_time');
            $table->json('working_days');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('providers');
    }
};
