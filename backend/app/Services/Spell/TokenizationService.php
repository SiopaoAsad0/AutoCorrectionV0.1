<?php

namespace App\Services\Spell;

class TokenizationService
{
    /**
     * Split text into words (tokens). Preserves original form; normalized form is lowercase, punctuation stripped.
     *
     * @return array<int, array{raw: string, normalized: string}>
     */
    public function tokenize(string $text): array
    {
        $tokens = [];
        $chunks = preg_split('/(\s+)/u', $text, -1, 2 | 1); // PREG_SPLIT_DELIMITER_CAPTURE | PREG_SPLIT_NO_EMPTY

        foreach ($chunks as $chunk) {
            $trimmed = trim($chunk);
            if ($trimmed === '') {
                continue;
            }
            $normalized = $this->normalizeWord($trimmed);
            if ($normalized !== '') {
                $tokens[] = ['raw' => $trimmed, 'normalized' => $normalized];
            }
        }

        return $tokens;
    }

    public function normalizeWord(string $word): string
    {
        $lower = mb_strtolower($word);
        return preg_replace('/[^\p{L}\p{N}\'-]/u', '', $lower);
    }
}
