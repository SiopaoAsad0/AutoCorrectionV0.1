<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class TypoPatternSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('typo_patterns')) {
            return;
        }

        // Intentionally empty by default: typo patterns can be learned/imported later.
    }
}
