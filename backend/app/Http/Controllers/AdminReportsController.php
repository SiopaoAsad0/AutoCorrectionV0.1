<?php

namespace App\Http\Controllers;

use App\Models\SpellCheckLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminReportsController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $userCount = User::count();

        $totals = SpellCheckLog::query()
            ->selectRaw('
                COALESCE(SUM(total_words), 0) as total_words,
                COALESCE(SUM(correct_words), 0) as correct_words,
                COALESCE(SUM(misspelled_words), 0) as misspelled_words,
                COALESCE(SUM(suggested_words), 0) as suggested_words,
                COALESCE(AVG(correction_rate), 0) as avg_correction_rate,
                COALESCE(AVG(word_error_rate), 0) as avg_word_error_rate,
                COUNT(DISTINCT user_email) as active_users,
                COUNT(*) as total_log_rows
            ')
            ->first();

        $totalClassified = (int) $totals->correct_words
            + (int) $totals->misspelled_words
            + (int) $totals->suggested_words;

        $correctPercentage = $totalClassified > 0
            ? round(($totals->correct_words / $totalClassified) * 100, 2)
            : 0.0;

        $incorrectPercentage = $totalClassified > 0
            ? round((($totals->misspelled_words + $totals->suggested_words) / $totalClassified) * 100, 2)
            : 0.0;

        return response()->json([
            'registered_users' => $userCount,
            'active_users_in_logs' => (int) $totals->active_users,
            'total_words_processed' => (int) $totals->total_words,
            'correct_words' => (int) $totals->correct_words,
            'misspelled_words' => (int) $totals->misspelled_words,
            'suggested_words' => (int) $totals->suggested_words,
            'correct_percentage' => $correctPercentage,
            'incorrect_percentage' => $incorrectPercentage,
            'avg_correction_rate' => round((float) $totals->avg_correction_rate, 4),
            'avg_word_error_rate' => round((float) $totals->avg_word_error_rate, 4),
            'total_log_rows' => (int) $totals->total_log_rows,
        ]);
    }

    public function distanceDistribution(Request $request): JsonResponse
    {
        $buckets = SpellCheckLog::query()
            ->whereNotNull('levenshtein_distance')
            ->selectRaw("
                CASE
                    WHEN levenshtein_distance <= 1 THEN '0-1'
                    WHEN levenshtein_distance <= 2 THEN '1-2'
                    WHEN levenshtein_distance <= 3 THEN '2-3'
                    ELSE '3+'
                END as distance_bucket,
                COUNT(*) as count,
                AVG(levenshtein_distance) as avg_levenshtein_distance,
                AVG(jaro_winkler_similarity) as avg_jaro_winkler_similarity,
                AVG(CASE WHEN suggestion_confidence IS NOT NULL THEN suggestion_confidence END) as avg_confidence
            ")
            ->groupBy('distance_bucket')
            ->orderBy('distance_bucket')
            ->get();

        $agreement = SpellCheckLog::query()
            ->whereNotNull('algorithm_agreement')
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN algorithm_agreement = 1 THEN 1 ELSE 0 END) as agreed
            ')
            ->first();

        $agreementRate = $agreement && $agreement->total > 0
            ? round(($agreement->agreed / $agreement->total) * 100, 2)
            : null;

        $preferredAlgorithmBreakdown = SpellCheckLog::query()
            ->whereNotNull('preferred_algorithm')
            ->selectRaw('preferred_algorithm, COUNT(*) as count')
            ->groupBy('preferred_algorithm')
            ->get();

        return response()->json([
            'distance_buckets' => $buckets,
            'algorithm_agreement_rate_percent' => $agreementRate,
            'preferred_algorithm_breakdown' => $preferredAlgorithmBreakdown,
        ]);
    }

    public function topMisspelled(Request $request): JsonResponse
    {
        $limit = (int) $request->input('limit', 25);
        $limit = max(1, min($limit, 200));

        $rows = SpellCheckLog::query()
            ->whereNotNull('misspelled_word')
            ->selectRaw('
                misspelled_word,
                COUNT(*) as occurrences,
                AVG(levenshtein_distance) as avg_distance,
                AVG(CASE WHEN suggestion_confidence IS NOT NULL THEN suggestion_confidence END) as avg_confidence
            ')
            ->groupBy('misspelled_word')
            ->orderByDesc('occurrences')
            ->limit($limit)
            ->get();

        return response()->json(['top_misspelled_words' => $rows]);
    }

    public function userActivity(Request $request): JsonResponse
    {
        $limit = (int) $request->input('limit', 50);
        $limit = max(1, min($limit, 500));

        $rows = SpellCheckLog::query()
            ->selectRaw('
                COALESCE(user_email, "(anonymous)") as user_email,
                COUNT(*) as log_rows,
                COALESCE(SUM(total_words), 0) as total_words,
                COALESCE(AVG(correction_rate), 0) as avg_correction_rate,
                COALESCE(AVG(word_error_rate), 0) as avg_word_error_rate,
                MAX(created_at) as last_active_at
            ')
            ->groupBy('user_email')
            ->orderByDesc('log_rows')
            ->limit($limit)
            ->get();

        return response()->json(['user_activity' => $rows]);
    }

    public function trend(Request $request): JsonResponse
    {
        $days = (int) $request->input('days', 30);
        $days = max(1, min($days, 365));

        $driver = DB::connection()->getDriverName();
        $dateExpr = match ($driver) {
            'sqlite' => "date(created_at)",
            'pgsql' => "to_char(created_at, 'YYYY-MM-DD')",
            default => "DATE(created_at)",
        };

        $rows = SpellCheckLog::query()
            ->where('created_at', '>=', now()->subDays($days))
            ->selectRaw("
                {$dateExpr} as day,
                COUNT(*) as log_rows,
                COALESCE(SUM(total_words), 0) as total_words,
                COALESCE(AVG(correction_rate), 0) as avg_correction_rate
            ")
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        return response()->json(['trend' => $rows]);
    }
}
