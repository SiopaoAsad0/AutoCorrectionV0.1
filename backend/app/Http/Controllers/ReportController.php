<?php

namespace App\Http\Controllers;

use App\Services\Spell\JaroWinklerService;
use App\Services\Spell\AdaptedLevenshteinService;
use App\Models\SpellCheckLog;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        private JaroWinklerService $jaroWinkler,
        private AdaptedLevenshteinService $levenshtein
    ) {}

    /**
     * GET /api/admin/reports/overview
     * Returns system-wide spell check statistics.
     */
    public function overview()
    {
        $logs = SpellCheckLog::selectRaw('
            COUNT(*) as total_checks,
            SUM(total_words) as total_words,
            SUM(correct_words) as total_correct,
            SUM(misspelled_words) as total_misspelled,
            SUM(suggested_words) as total_suggested,
            AVG(correction_rate) as avg_correction_rate,
            AVG(word_error_rate) as avg_wer,
            COUNT(DISTINCT user_email) as unique_users
        ')->first();

        $dailyTrend = SpellCheckLog::selectRaw('
            DATE(created_at) as date,
            COUNT(*) as checks,
            AVG(correction_rate) as avg_correction_rate,
            SUM(misspelled_words) as misspelled
        ')
        ->groupBy('date')
        ->orderByDesc('date')
        ->limit(30)
        ->get();

        $topMisspelled = SpellCheckLog::selectRaw('
            misspelled_word,
            COUNT(*) as frequency,
            AVG(levenshtein_distance) as avg_lev_distance,
            AVG(jaro_winkler_similarity) as avg_jw_similarity
        ')
        ->whereNotNull('misspelled_word')
        ->groupBy('misspelled_word')
        ->orderByDesc('frequency')
        ->limit(20)
        ->get();

        $algorithmComparison = SpellCheckLog::selectRaw('
            AVG(levenshtein_distance) as avg_lev_distance,
            AVG(jaro_winkler_similarity) as avg_jw_similarity,
            SUM(CASE WHEN algorithm_agreement = 1 THEN 1 ELSE 0 END) as agreements,
            COUNT(*) as total,
            AVG(CASE WHEN preferred_algorithm = "levenshtein" THEN 1 ELSE 0 END) as lev_preferred_rate
        ')
        ->whereNotNull('levenshtein_distance')
        ->first();

        return response()->json([
            'overview'             => $logs,
            'daily_trend'          => $dailyTrend,
            'top_misspelled'       => $topMisspelled,
            'algorithm_comparison' => $algorithmComparison,
        ]);
    }

    /**
     * GET /api/admin/reports/users
     * Per-user statistics.
     */
    public function users()
    {
        $users = SpellCheckLog::selectRaw('
            user_email,
            COUNT(*) as total_checks,
            SUM(total_words) as total_words,
            SUM(misspelled_words) as total_misspelled,
            AVG(correction_rate) as avg_correction_rate,
            AVG(word_error_rate) as avg_wer,
            MAX(created_at) as last_active
        ')
        ->whereNotNull('user_email')
        ->groupBy('user_email')
        ->orderByDesc('total_checks')
        ->get();

        return response()->json(['users' => $users]);
    }

    /**
     * GET /api/admin/reports/algorithm-comparison
     * Detailed Levenshtein vs Jaro-Winkler comparison.
     */
    public function algorithmComparison(Request $request)
    {
        $word   = $request->query('word', '');
        $target = $request->query('target', '');

        if ($word && $target) {
            $levDist = $this->levenshtein->distance($word, $target);
            $breakdown = $this->levenshtein->editBreakdown($word, $target);
            $comparison = $this->jaroWinkler->compareWithLevenshtein($word, $target, $levDist);
            return response()->json(array_merge($comparison, ['breakdown' => $breakdown]));
        }

        // Return aggregated comparison from logs
        $data = SpellCheckLog::selectRaw('
            misspelled_word as source,
            suggested_word as target,
            AVG(levenshtein_distance) as avg_lev,
            AVG(jaro_winkler_similarity) as avg_jw,
            COUNT(*) as occurrences,
            SUM(CASE WHEN algorithm_agreement = 1 THEN 1 ELSE 0 END) as agreements
        ')
        ->whereNotNull('misspelled_word')
        ->whereNotNull('suggested_word')
        ->groupBy('misspelled_word', 'suggested_word')
        ->orderByDesc('occurrences')
        ->limit(50)
        ->get();

        return response()->json(['comparisons' => $data]);
    }

    /**
     * POST /api/admin/reports/compare
     * Live algorithm comparison for any word pair.
     */
    public function comparePair(Request $request)
    {
        $request->validate([
            'source' => 'required|string|max:100',
            'target' => 'required|string|max:100',
        ]);

        $source  = mb_strtolower(trim($request->input('source')));
        $target  = mb_strtolower(trim($request->input('target')));
        $levDist = $this->levenshtein->distance($source, $target);
        $breakdown = $this->levenshtein->editBreakdown($source, $target);
        $comparison = $this->jaroWinkler->compareWithLevenshtein($source, $target, $levDist);

        return response()->json(array_merge($comparison, [
            'edit_breakdown' => $breakdown,
        ]));
    }
}
