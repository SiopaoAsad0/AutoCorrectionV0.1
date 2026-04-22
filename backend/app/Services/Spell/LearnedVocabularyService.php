<?php

namespace App\Services\Spell;

use App\Models\LearnedLexeme;

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

        return LearnedLexeme::query()
            ->where('lexeme', $normalized)
            ->where('frequency', '>=', $min)
            ->exists();
    }
}
