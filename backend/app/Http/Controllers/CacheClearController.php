<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * TEMPORARY, ONE-TIME USE ONLY.
 *
 * If a Dockerfile/start script runs `php artisan route:cache` (or
 * config:cache) at some point, Laravel serves routes from the cached file
 * in bootstrap/cache/ instead of routes/api.php, so a newly added route
 * can 404 even after a fresh deploy. This clears those caches via HTTP
 * since Shell/Pre-Deploy Command aren't available on this Render plan.
 *
 * Setup: reuse the same SEED_RUNNER_SECRET env var from before, or add a
 * new one. Visit:
 *   /api/clear-caches?secret=<secret>
 *
 * DELETE this controller and its route once confirmed working.
 */
class CacheClearController extends Controller
{
    public function run(Request $request)
    {
        $expected = env('SEED_RUNNER_SECRET');

        if (! $expected || $request->query('secret') !== $expected) {
            abort(403, 'Invalid or missing secret.');
        }

        $results = [];
        foreach (['route:clear', 'config:clear', 'cache:clear', 'view:clear'] as $command) {
            try {
                Artisan::call($command);
                $results[$command] = 'ok';
            } catch (\Throwable $e) {
                $results[$command] = 'failed: '.$e->getMessage();
            }
        }

        return response()->json([
            'status' => 'done',
            'results' => $results,
            'reminder' => 'Delete this route/controller now that caches are cleared.',
        ]);
    }
}
