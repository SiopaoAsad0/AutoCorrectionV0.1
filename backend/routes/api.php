<?php

use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\AdminDictionaryController;
use App\Http\Controllers\SpellController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/
Route::post('/correct', [SpellController::class, 'correct']);

Route::post('/admin/login', [AdminAuthController::class, 'login']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::post('/logout', [AdminAuthController::class, 'logout']);
    Route::get('/me', [AdminAuthController::class, 'me']);
    Route::get('/datasets', [AdminDictionaryController::class, 'datasets']);
    Route::get('/dictionary', [AdminDictionaryController::class, 'index']);
    Route::post('/dictionary', [AdminDictionaryController::class, 'store']);
    Route::put('/dictionary/{dictionary}', [AdminDictionaryController::class, 'update']);
    Route::delete('/dictionary/{dictionary}', [AdminDictionaryController::class, 'destroy']);
    Route::post('/dictionary/import', [AdminDictionaryController::class, 'importLines']);
    Route::post('/dictionary/import-dataset', [AdminDictionaryController::class, 'importDataset']);
});
