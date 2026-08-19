<?php
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\AdminContactController;
use App\Http\Controllers\AdminDictionaryController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\SpellController;
use App\Http\Controllers\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/
Route::post('/correct', [SpellController::class, 'correct']);
Route::post('/predict', [SpellController::class, 'predict']);
Route::post('/vocabulary/learn', [SpellController::class, 'learnLexeme']);
Route::post('/compare', [SpellController::class, 'compare']);
Route::post('/contact', [ContactController::class, 'store']);
Route::get('/contact/messages', [ContactController::class, 'index']);
Route::post('/admin/login', [AdminAuthController::class, 'login']);

Route::get('/debug/dictionary-check', function (Request $request) {
    $word = $request->query('word', 'spelling');
    $rows = \App\Models\Dictionary::where('word', $word)->get();
    $total = \App\Models\Dictionary::count();
    return response()->json([
        'word_queried' => $word,
        'found' => $rows->count(),
        'rows' => $rows,
        'total_dictionary_rows' => $total,
    ]);
});

Route::get('/debug/filesystem-check', function () {
    $basePath = base_path();
    $bundled = base_path('database/seeders/data/lexicons');
    $englishFile = base_path('database/seeders/data/lexicons/english/google-10000-english.txt');

    $listSeedersDir = @scandir(base_path('database/seeders'));
    $listDataDir = @scandir(base_path('database/seeders/data'));
    $listLexiconsDir = @scandir($bundled);

    return response()->json([
        'base_path' => $basePath,
        'bundled_path_checked' => $bundled,
        'bundled_is_dir' => is_dir($bundled),
        'english_file_path_checked' => $englishFile,
        'english_file_exists' => file_exists($englishFile),
        'english_file_readable' => is_readable($englishFile),
        'listing_of_seeders_dir' => $listSeedersDir,
        'listing_of_seeders_data_dir' => $listDataDir,
        'listing_of_lexicons_dir' => $listLexiconsDir,
    ]);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
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
});
