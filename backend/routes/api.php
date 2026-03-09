<?php

use App\Http\Controllers\SpellController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/
Route::post('/correct', [SpellController::class, 'correct']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
