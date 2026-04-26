<?php

namespace App\Services\Spell;

use App\Models\LearnedLexeme;
use Illuminate\Database\QueryException;

/**
 * User-approved / high-frequency learned terms and static slang allowlist.
 * Used to avoid flagging valid informal vocabulary as misspellings.
 */
class LearnedVocabularyService
{
    public function isProtected(string $normalized): bool
    {
        $normalized = mb_strtolower($normalized);
        $list = config('spelling.accepted_slang_lexemes', []);
        if (in_array($normalized, $list, true)) {
            return true;
        }

        $min = (int) config('spelling.learned_lexeme_auto_accept_min', 5);
        if ($min < 2) {
            return false;
        }

        try {
            return LearnedLexeme::query()
                ->where('lexeme', $normalized)
                ->where('frequency', '>=', $min)
                ->exists();
        } catch (QueryException) {
            // Prevent analysis from crashing when migrations were not run yet.
            return false;
        }
    }

    /**
     * Record observed usage for unknown tokens to support adaptive lexicon growth.
     */
    public function recordUsage(string $normalized, int $minTokenLength = 3): int
    {
        $normalized = mb_strtolower(trim($normalized));
        if ($normalized === '' || mb_strlen($normalized) < $minTokenLength) {
            return 0;
        }
        if (preg_match('/^[\p{L}\p{N}\'-]+$/u', $normalized) !== 1) {
            return 0;
        }

        return LearnedLexeme::bumpFrequency($normalized);
    }
}
