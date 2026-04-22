<?php

namespace App\Http\Controllers;

use App\Models\CorrectionLog;
use App\Models\LearnedLexeme;
use App\Services\Spell\GrammarDetectionService;
use App\Services\Spell\NextWordPredictionService;
use App\Services\Spell\SpellCorrectionService;
use App\Services\Spell\TokenizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SpellController extends Controller
{
    public function __construct(
        private SpellCorrectionService $spellCorrection,
        private GrammarDetectionService $grammarDetection,
        private NextWordPredictionService $nextWordPrediction,
        private TokenizationService $tokenization
    ) {}

    /**
     * Correct spelling, attach grammar hints, optional next-word predictions.
     */
    public function correct(Request $request): JsonResponse
    {
        $request->validate([
            'text' => 'required|string|max:10000',
            'include_predictions' => 'sometimes|boolean',
        ]);

        $text = $request->input('text');
        $started = microtime(true);
        $result = $this->spellCorrection->correct($text);

        $grammarIssues = $this->grammarDetection->analyze($this->tokenization->tokenize($text));
        $result['grammar_issues'] = $grammarIssues;
        $result['analytics'] = array_merge($result['analytics'] ?? [], [
            'grammar_issue_count' => count($grammarIssues),
        ]);

        if ($request->boolean('include_predictions')) {
            $result['predictions'] = $this->nextWordPrediction->predict($text);
        }

        $result['engine'] = [
            'spell' => 'dictionary_levenshtein_context_v1',
            'grammar' => 'rules_v1',
            'prediction' => $request->boolean('include_predictions') ? 'heuristic_bigram_v1' : null,
        ];

        $result['processing_time_ms'] = round((microtime(true) - $started) * 1000, 2);

        try {
            CorrectionLog::create([
                'original_text' => $text,
                'suggestions' => $result,
                'analytics' => $result['analytics'] ?? null,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json($result);
    }

    /**
     * Next-word suggestions (keyboard-style). Heuristic seeds — swap for LM later.
     */
    public function predict(Request $request): JsonResponse
    {
        $request->validate([
            'text' => 'required|string|max:5000',
        ]);

        return response()->json([
            'predictions' => $this->nextWordPrediction->predict($request->input('text')),
        ]);
    }

    /**
     * Record user-accepted vocabulary (frequency for continuous learning).
     */
    public function learnLexeme(Request $request): JsonResponse
    {
        $request->validate([
            'lexeme' => 'required|string|max:191',
        ]);

        $lexeme = (string) $request->input('lexeme');
        $frequency = LearnedLexeme::bumpFrequency($lexeme);

        return response()->json([
            'lexeme' => mb_strtolower(trim($lexeme)),
            'frequency' => $frequency,
        ]);
    }
}
