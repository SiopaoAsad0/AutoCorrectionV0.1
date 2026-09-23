<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * TEMPORARY, ONE-TIME USE ONLY.
 * Runs pending migrations over HTTP since Shell/Pre-Deploy Command aren't
 * available on this Render plan. DELETE this controller and its route
 * once confirmed working.
 *
 * Setup: reuse SEED_RUNNER_SECRET from before (or set a new one), then visit:
 *   /api/run-migrations?secret=<secret>
 */
class MigrationRunnerController extends Controller
{
    public function run(Request $request)
    {
        $expected = env('SEED_RUNNER_SECRET');

        if (! $expected || $request->query('secret') !== $expected) {
            abort(403, 'Invalid or missing secret.');
        }

        $output = '';
        try {
            Artisan::call('migrate', ['--force' => true]);
            $output = Artisan::output();
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'output' => $output,
            ], 500);
        }

        return response()->json([
            'status' => 'done',
            'output' => $output,
            'reminder' => 'Delete this route/controller now that migrations have run.',
        ]);
    }
}
