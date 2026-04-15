<?php

namespace App\Providers;

use Database\Seeders\DictionarySeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
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
        $this->seedDictionaryWhenEmpty();
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
}
