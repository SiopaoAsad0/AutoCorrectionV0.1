<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class ContactMessageSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('contact_messages')) {
            return;
        }

        // Intentionally empty by default: contact messages are user-generated.
    }
}
