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

        if (DB::table('dictionaries')->exists()) {
            return;
        }

        try {
            Artisan::call('db:seed', [
                '--class' => DictionarySeeder::class,
                '--force' => true,
            ]);
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
