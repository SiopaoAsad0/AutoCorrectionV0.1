<?php
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\AdminContactController;
use App\Http\Controllers\AdminDictionaryController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\SpellController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StudentAuthController;
use App\Http\Controllers\PasswordOtpController;
use Illuminate\Support\Facades\Route;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/
Route::post('/register', [StudentAuthController::class, 'register']);
Route::post('/login', [StudentAuthController::class, 'login']);
Route::post('/forgot-password', [StudentAuthController::class, 'forgotPassword']);
Route::post('/reset-password', [StudentAuthController::class, 'resetPassword']);

// Password reset by emailed 6-digit code (OTP): send -> verify -> change password.
// Throttled per IP on top of the per-email limits enforced in the controller.
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/password/otp/send',   [PasswordOtpController::class, 'send']);
    Route::post('/password/otp/verify', [PasswordOtpController::class, 'verify']);
    Route::post('/password/otp/reset',  [PasswordOtpController::class, 'reset']);
});
Route::middleware('auth:sanctum')->post('/logout', [StudentAuthController::class, 'logout']);
Route::middleware('auth:sanctum')->get('/me', [StudentAuthController::class, 'me']);

Route::middleware('auth:sanctum')->post('/correct', [SpellController::class, 'correct']);
Route::middleware('auth:sanctum')->get('/user/test-count', [SpellController::class, 'testCount']);
Route::post('/predict', [SpellController::class, 'predict']);
Route::post('/vocabulary/learn', [SpellController::class, 'learnLexeme']);
Route::post('/compare', [SpellController::class, 'compare']);
Route::post('/contact', [ContactController::class, 'store']);
Route::get('/contact/messages', [ContactController::class, 'index']);
Route::post('/admin/login', [AdminAuthController::class, 'login']);

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::post('/logout', [AdminAuthController::class, 'logout']);
    Route::get('/me', [AdminAuthController::class, 'me']);
    Route::get('/datasets', [AdminDictionaryController::class, 'datasets']);
    Route::get('/dictionary', [AdminDictionaryController::class, 'index']);
    Route::post('/dictionary', [AdminDictionaryController::class, 'store']);
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::put('/dictionary/{dictionary}', [AdminDictionaryController::class, 'update']);
    Route::delete('/dictionary/{dictionary}', [AdminDictionaryController::class, 'destroy']);
    Route::post('/dictionary/import', [AdminDictionaryController::class, 'importLines']);
    Route::post('/dictionary/import-dataset', [AdminDictionaryController::class, 'importDataset']);
    Route::get('/contact-messages', [AdminContactController::class, 'index']);
    Route::post('/contact-messages/{contactMessage}/reply', [AdminContactController::class, 'reply']);
    Route::get('/reports/overview', [ReportController::class, 'overview']);
    Route::get('/reports/users', [ReportController::class, 'users']);
    Route::post('/reports/compare', [ReportController::class, 'comparePair']);
    Route::get('/reports/export', [ReportController::class, 'exportCsv']);
    Route::post('/reports/import', [ReportController::class, 'importCsv']);
    Route::get('/reports/imports', [ReportController::class, 'imports']);
});
