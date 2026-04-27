<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class CorrectionLogSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('correction_logs')) {
            return;
        }

        // Intentionally empty by default: logs are generated at runtime.
    }
}
