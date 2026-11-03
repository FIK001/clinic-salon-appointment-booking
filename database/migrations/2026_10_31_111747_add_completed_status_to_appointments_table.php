<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE appointments
            MODIFY status ENUM('booked', 'cancelled', 'no_show', 'completed')
            NOT NULL DEFAULT 'booked'
        ");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            ALTER TABLE appointments
            MODIFY status ENUM('booked', 'cancelled', 'no_show')
            NOT NULL DEFAULT 'booked'
        ");
    }
};
