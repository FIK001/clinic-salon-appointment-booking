<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_schedules', function (Blueprint $table) {
            $table->id();

            $table->foreignId('provider_id')
                ->unique()
                ->constrained('providers')
                ->cascadeOnDelete();

            $table->json('working_days');

            $table->time('start_time');
            $table->time('end_time');

            $table->time('break_start')->nullable();
            $table->time('break_end')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_schedules');
    }
};
