<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
      $this->call([
    AdminUserSeeder::class,
    DictionarySeeder::class,
    MissingWordsDictionarySeeder::class,  // ← add this line
    LearnedLexemeSeeder::class,
    ContactMessageSeeder::class,
    CorrectionLogSeeder::class,
    TypoPatternSeeder::class,
]);
    }
}
