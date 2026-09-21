<?php

namespace App\Http\Controllers;

use App\Services\Spell\JaroWinklerService;
use App\Services\Spell\AdaptedLevenshteinService;
use App\Models\SpellCheckLog;
use App\Models\User;
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
        $registeredUsers = User::count();

        // Scoped to summary rows only (misspelled_word IS NULL) -- one such
        // row exists per test run. Word-detail rows carry a duplicate copy
        // of total_words/correction_rate/etc for that same test, so
        // including them here would multiply every total by (1 + number of
        // flagged words) instead of counting each test once.
        $logs = SpellCheckLog::selectRaw('
            COUNT(*) as total_checks,
            SUM(total_words) as total_words,
            SUM(correct_words) as total_correct,
            SUM(misspelled_words) as total_misspelled,
            SUM(suggested_words) as total_suggested,
            AVG(correction_rate) as avg_correction_rate,
            AVG(word_error_rate) as avg_wer,
            COUNT(DISTINCT user_email) as unique_users
        ')
        ->whereNull('misspelled_word')
        ->first();

        $dailyTrend = SpellCheckLog::selectRaw('
            DATE(created_at) as date,
            COUNT(*) as checks,
            AVG(correction_rate) as avg_correction_rate,
            SUM(misspelled_words) as misspelled
        ')
        ->whereNull('misspelled_word')
        ->groupBy('date')
        ->orderByDesc('date')
        ->limit(30)
        ->get();

        $topMisspelled = SpellCheckLog::selectRaw('
            misspelled_word,
            COUNT(*) as frequency,
            AVG(levenshtein_distance) as avg_lev_distance,
            AVG(jaro_winkler_similarity) as avg_jw_similarity,
            AVG(CASE WHEN suggestion_confidence IS NOT NULL THEN suggestion_confidence END) as avg_confidence
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
            'registered_users'     => $registeredUsers,
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
        // Scoped to summary rows only -- see overview() for why.
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
        ->whereNull('misspelled_word')
        ->groupBy('user_email')
        ->orderByDesc('total_checks')
        ->get();

        return response()->json(['users' => $users]);
    }

    /**
     * GET /api/admin/reports/export
     * CSV export of the per-user report table (same data as users(),
     * scoped to summary rows only so counts/totals aren't inflated by
     * per-word detail rows).
     */
    public function exportCsv()
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
        ->whereNull('misspelled_word')
        ->groupBy('user_email')
        ->orderByDesc('total_checks')
        ->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="pnc_spell_checker_report.csv"',
        ];

        return response()->streamDownload(function () use ($users) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel doesn't mangle special characters
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['User Email', 'Total Checks', 'Total Words', 'Total Misspelled', 'Avg Correction Rate', 'Avg Word Error Rate', 'Last Active']);
            foreach ($users as $row) {
                fputcsv($out, [
                    $row->user_email,
                    (int) $row->total_checks,
                    (int) $row->total_words,
                    (int) $row->total_misspelled,
                    round((float) $row->avg_correction_rate, 4),
                    round((float) $row->avg_wer, 4),
                    $row->last_active,
                ]);
            }
            fclose($out);
        }, 'pnc_spell_checker_report.csv', $headers);
    }

    /**
     * POST /api/admin/reports/import
     * Accepts a CSV previously produced by exportCsv() (or matching its
     * column headers) and stores it as a labeled snapshot for later
     * review, without touching the live SpellCheckLog data.
     */
    public function importCsv(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $path = $request->file('file')->getRealPath();
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return response()->json(['message' => 'Could not read the uploaded file.'], 422);
        }

        // Strip a UTF-8 BOM if present (Excel adds one on export).
        $firstBytes = fread($handle, 3);
        if ($firstBytes !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $header = fgetcsv($handle);
        $expected = ['User Email', 'Total Checks', 'Total Words', 'Total Misspelled', 'Avg Correction Rate', 'Avg Word Error Rate', 'Last Active'];
        if ($header === false || array_map('trim', $header) !== $expected) {
            fclose($handle);
            return response()->json([
                'message' => 'This file does not match the expected report format. Only CSV files exported from this system can be imported.',
            ], 422);
        }

        $batch = now()->toIso8601String();
        $rows = [];
        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) < 7) continue; // skip malformed/blank lines
            $rows[] = [
                'batch'               => $batch,
                'user_email'          => $line[0],
                'total_checks'        => (int) $line[1],
                'total_words'         => (int) $line[2],
                'total_misspelled'    => (int) $line[3],
                'avg_correction_rate' => (float) $line[4],
                'avg_word_error_rate' => (float) $line[5],
                'last_active'         => $line[6] !== '' ? $line[6] : null,
                'created_at'          => now(),
                'updated_at'          => now(),
            ];
        }
        fclose($handle);

        if (empty($rows)) {
            return response()->json(['message' => 'The file contained no data rows to import.'], 422);
        }

        \App\Models\ImportedReportRow::insert($rows);

        return response()->json([
            'message' => 'Import successful.',
            'batch' => $batch,
            'imported_rows' => count($rows),
        ]);
    }

    /**
     * GET /api/admin/reports/imports
     * Lists previously imported CSV reports, grouped by import batch, for
     * display in the Reports section per the import requirement.
     */
    public function imports()
    {
        $rows = \App\Models\ImportedReportRow::orderByDesc('batch')->get();

        $batches = $rows->groupBy('batch')->map(function ($rowsInBatch, $batch) {
            return [
                'batch' => $batch,
                'rows' => $rowsInBatch->values(),
            ];
        })->values();

        return response()->json(['batches' => $batches]);
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
