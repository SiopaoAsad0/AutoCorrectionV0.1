<?php

namespace App\Http\Controllers;

use App\Models\SpellCheckLog;
use App\Services\Spell\SpellCorrectionService;
use App\Services\Spell\JaroWinklerService;
use App\Services\Spell\AdaptedLevenshteinService;
use App\Services\Spell\NextWordPredictionService;
use App\Services\Spell\LearnedVocabularyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SpellController extends Controller
{
    public function __construct(
        private SpellCorrectionService $correctionService,
        private JaroWinklerService $jaroWinkler,
        private AdaptedLevenshteinService $levenshtein,
        private NextWordPredictionService $predictionService,
        private LearnedVocabularyService $learnedVocabulary
    ) {}

    public function correct(Request $request): JsonResponse
    {
        $request->validate(['text' => 'required|string|max:10000']);
        $text  = $request->input('text');
        $email = $request->input('user_email');
        $start = microtime(true);

        $result = $this->correctionService->correct($text);

        $processingMs = (int) round((microtime(true) - $start) * 1000);

        // Attach Jaro-Winkler comparison data to each suggestion
        foreach ($result['words'] as &$wordResult) {
            if (empty($wordResult['suggestions'])) continue;
            foreach ($wordResult['suggestions'] as &$suggestion) {
                $source  = $wordResult['normalized'] ?? $wordResult['word'];
                $target  = $suggestion['word'];
                $levDist = (float) ($suggestion['distance'] ?? 1.0);
                $suggestion['algorithm_comparison'] = $this->jaroWinkler->compareWithLevenshtein(
                    $source, $target, $levDist
                );
            }
            unset($suggestion);
        }
        unset($wordResult);

        // Log to database
        $this->logSpellCheck($result, $text, $email);

        return response()->json(array_merge($result, [
            'processing_time_ms' => $processingMs,
        ]));
    }

    public function predict(Request $request): JsonResponse
    {
        $request->validate(['text' => 'required|string|max:2000']);
        $predictions = $this->predictionService->predict($request->input('text'));
        return response()->json(['predictions' => $predictions]);
    }

    public function learnVocabulary(Request $request): JsonResponse
    {
        $request->validate(['lexeme' => 'required|string|max:191']);
        $lexeme    = mb_strtolower(trim($request->input('lexeme')));
        $frequency = $this->learnedVocabulary->recordUsage($lexeme);
        return response()->json(['lexeme' => $lexeme, 'frequency' => $frequency]);
    }

    /**
     * POST /api/compare — live algorithm comparison for any word pair.
     */
    public function compare(Request $request): JsonResponse
    {
        $request->validate([
            'source' => 'required|string|max:100',
            'target' => 'required|string|max:100',
        ]);

        $source    = mb_strtolower(trim($request->input('source')));
        $target    = mb_strtolower(trim($request->input('target')));
        $levDist   = $this->levenshtein->distance($source, $target);
        $breakdown = $this->levenshtein->editBreakdown($source, $target);
        $comparison = $this->jaroWinkler->compareWithLevenshtein($source, $target, $levDist);

        return response()->json(array_merge($comparison, [
            'edit_breakdown' => $breakdown,
        ]));
    }

    /**
     * Log spell check results including per-word Levenshtein + Jaro-Winkler data.
     */
    private function logSpellCheck(array $result, string $text, ?string $email): void
    {
        try {
            $analytics      = $result['analytics'] ?? [];
            $statusCounts   = $analytics['status_counts'] ?? [];
            $totalWords     = (int) ($analytics['total_words'] ?? 0);
            $correctWords   = (int) ($statusCounts['correct'] ?? 0);
            $misspelled     = (int) ($statusCounts['misspelled'] ?? 0);
            $suggested      = (int) ($statusCounts['suggested'] ?? 0);
            $correctionRate = (float) ($analytics['correction_rate'] ?? 0);
            $wer            = (float) ($analytics['word_error_rate'] ?? 0);
            $language       = $result['language'] ?? null;

            $baseLog = [
                'user_email'       => $email,
                'input_text'       => mb_substr($text, 0, 1000),
                'total_words'      => $totalWords,
                'correct_words'    => $correctWords,
                'misspelled_words' => $misspelled,
                'suggested_words'  => $suggested,
                'correction_rate'  => $correctionRate,
                'word_error_rate'  => $wer,
                'detected_language'=> $language,
            ];

            // Log one row per misspelled/suggested word with algorithm comparison
            $wordRows = [];
            foreach ($result['words'] ?? [] as $wordResult) {
                if (!in_array($wordResult['status'] ?? '', ['misspelled', 'suggested'])) continue;
                $topSuggestion = $wordResult['suggestions'][0] ?? null;
                $comparison    = $topSuggestion['algorithm_comparison'] ?? null;

                $breakdown = $topSuggestion['error_breakdown'] ?? null;
                $wordRows[] = array_merge($baseLog, [
                    'misspelled_word'          => $wordResult['normalized'] ?? $wordResult['word'],
                    'suggested_word'           => $topSuggestion['word'] ?? null,
                    'levenshtein_distance'     => $topSuggestion['distance'] ?? null,
                    'levenshtein_normalized'   => $comparison['levenshtein_normalized'] ?? null,
                    'jaro_winkler_similarity'  => $comparison['jaro_winkler_similarity'] ?? null,
                    'jaro_winkler_distance'    => $comparison['jaro_winkler_distance'] ?? null,
                    'jaro_similarity'          => $comparison['jaro_similarity'] ?? null,
                    'algorithm_agreement'      => $comparison['agreement'] ?? null,
                    'preferred_algorithm'      => $comparison['preferred_algorithm'] ?? null,
                    'substitutions'            => $breakdown['substitutions'] ?? null,
                    'insertions'               => $breakdown['insertions'] ?? null,
                    'deletions'                => $breakdown['deletions'] ?? null,
                    'created_at'               => now(),
                    'updated_at'               => now(),
                ]);
            }

            if (!empty($wordRows)) {
                SpellCheckLog::insert($wordRows);
            } else {
                SpellCheckLog::create($baseLog);
            }
        } catch (\Throwable) {
            // Never fail the API response due to logging errors
        }
    }
}
