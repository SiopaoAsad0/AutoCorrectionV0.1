<?php

namespace App\Providers;

use Database\Seeders\DictionarySeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Throwable;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Once DictionarySeeder has actually run its bulk lexicon imports
     * (google-10000-english x2, typo corpora, tagalog_dict.txt x2,
     * taglish_common.txt), the table holds well over this many rows.
     * Used instead of a plain "any row exists" check, which used to
     * permanently skip re-seeding the moment the table had even the
     * ~200 curated words in it — silently blocking the bulk imports
     * from ever running once they were added later.
     */
    private const FULLY_SEEDED_ROW_THRESHOLD = 5000;

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->ensureSqliteDatabaseFile();

        try {
            $this->seedDictionaryWhenEmpty();
        } catch (Throwable $e) {
            Log::warning('Skipping dictionary auto-seed during boot because database is not reachable.', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function seedDictionaryWhenEmpty(): void
    {
        if (! config('spelling.auto_seed_dictionary', true)) {
            return;
        }

        if (! Schema::hasTable('dictionaries')) {
            return;
        }

        // Was: DB::table('dictionaries')->exists() — true the moment even
        // one curated word was present, which permanently skipped the bulk
        // lexicon imports on every subsequent boot. A count threshold lets
        // this correctly detect "curated words only, bulk import never ran"
        // and backfill it once, while still skipping on every boot after
        // the table is genuinely fully seeded.
        if (DB::table('dictionaries')->count() >= self::FULLY_SEEDED_ROW_THRESHOLD) {
            return;
        }

        try {
            Artisan::call('db:seed', [
                '--class' => DictionarySeeder::class,
                '--force' => true,
            ]);
            Log::info('Dictionary auto-seed ran during boot (row count below fully-seeded threshold).');
        } catch (Throwable $e) {
            Log::warning('Failed to auto-seed dictionaries.', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function ensureSqliteDatabaseFile(): void
    {
        if (config('database.default') !== 'sqlite') {
            return;
        }

        $database = (string) config('database.connections.sqlite.database');
        if ($database === '' || $database === ':memory:') {
            return;
        }

        try {
            $directory = dirname($database);
            if (! File::exists($directory)) {
                File::makeDirectory($directory, 0755, true);
            }
            if (! File::exists($database)) {
                File::put($database, '');
            }
        } catch (Throwable $e) {
            Log::warning('Could not ensure sqlite database file exists.', [
                'database' => $database,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
