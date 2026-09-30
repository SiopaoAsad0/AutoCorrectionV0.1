<?php

namespace Database\Seeders;

use App\Models\ContactMessage;
use App\Models\CorrectionLog;
use App\Models\Dictionary;
use App\Models\LearnedLexeme;
use App\Models\TypoPattern;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * This runs on every container start, so each step must be safe to
     * repeat. The admin seeder is always called (it should use
     * updateOrCreate). The bulk seeders only run when their table is
     * still empty, so restarts don't re-import ~100,000 dictionary words
     * or duplicate sample data.
     */
    public function run(): void
    {
        // Must be idempotent (updateOrCreate / firstOrCreate on email).
        $this->call(AdminUserSeeder::class);

        if (Dictionary::count() === 0) {
            $this->call([
                DictionarySeeder::class,
                MissingWordsDictionarySeeder::class,
            ]);
        }

        if (LearnedLexeme::count() === 0) {
            $this->call(LearnedLexemeSeeder::class);
        }

        if (ContactMessage::count() === 0) {
            $this->call(ContactMessageSeeder::class);
        }

        if (CorrectionLog::count() === 0) {
            $this->call(CorrectionLogSeeder::class);
        }

        if (TypoPattern::count() === 0) {
            $this->call(TypoPatternSeeder::class);
        }
    }
}
