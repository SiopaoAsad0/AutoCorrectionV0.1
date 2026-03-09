<?php

namespace App\Http\Controllers;

use App\Models\CorrectionLog;
use App\Services\Spell\SpellCorrectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SpellController extends Controller
{
    public function __construct(
        private SpellCorrectionService $spellCorrection
    ) {
    }

    /**
     * Correct spelling and return word-level results + analytics.
     */
    public function correct(Request $request): JsonResponse
    {
        $request->validate([
            'text' => 'required|string|max:10000',
        ]);

        $text = $request->input('text');
        $result = $this->spellCorrection->correct($text);

        try {
            CorrectionLog::create([
                'original_text' => $text,
                'suggestions' => $result,
                'analytics' => $result['analytics'] ?? null,
            ]);
        } catch (\Throwable $e) {
            report($e);
            // Continue even if logging fails (e.g. DB not configured)
        }

        return response()->json($result);
    }
}
