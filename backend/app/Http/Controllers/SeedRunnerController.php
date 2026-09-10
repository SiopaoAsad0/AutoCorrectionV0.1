<?php

namespace App\Http\Controllers;

use Database\Seeders\DictionarySeeder;
use Database\Seeders\MissingWordsDictionarySeeder;
use Database\Seeders\TypoPatternSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * TEMPORARY, ONE-TIME USE ONLY.
 *
 * Free Render plans don't allow Shell access or a custom Pre-Deploy Command,
 * so this exposes a secret-protected route to manually trigger the
 * dictionary seeders over HTTP instead.
 *
 * Setup:
 *  1. Add SEED_RUNNER_SECRET=<some-long-random-string> to Render's
 *     Environment tab for this service, and redeploy.
 *  2. Register the route (see routes/api.php addition below).
 *  3. Visit: https://<your-backend>.onrender.com/api/run-dictionary-seed?secret=<same-string>
 *  4. Confirm the JSON response shows success and the row count increased.
 *  5. DELETE this controller and its route, then redeploy. This must not
 *     stay live permanently — it re-runs expensive bulk inserts and is a
 *     needless attack surface once you're done.
 */
class SeedRunnerController extends Controller
{
    public function run(Request $request)
    {
        $expected = config('app.seed_runner_secret') ?: env('SEED_RUNNER_SECRET');

        if (! $expected || $request->query('secret') !== $expected) {
            abort(403, 'Invalid or missing secret.');
        }

        $before = DB::table('dictionaries')->count();

        Artisan::call('db:seed', ['--class' => DictionarySeeder::class, '--force' => true]);
        Artisan::call('db:seed', ['--class' => MissingWordsDictionarySeeder::class, '--force' => true]);
        Artisan::call('db:seed', ['--class' => TypoPatternSeeder::class, '--force' => true]);

        $after = DB::table('dictionaries')->count();
        $typoPatternCount = DB::table('typo_patterns')->count();

        return response()->json([
            'status' => 'done',
            'dictionaries_before' => $before,
            'dictionaries_after' => $after,
            'typo_patterns_after' => $typoPatternCount,
            'reminder' => 'Delete this route/controller now that seeding is confirmed.',
        ]);
    }
}
