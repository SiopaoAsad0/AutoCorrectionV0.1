<?php

namespace App\Services\Spell;

class LanguageDetectionService
{
    /**
     * Detect sentence language from word-level language counts.
     *
     * @param array<int, array{language?: string}> $wordResults Each item may have 'language' from dictionary
     */
    public function detect(array $wordResults): string
    {
        $en = 0;
        $tl = 0;
        $taglish = 0;

        foreach ($wordResults as $w) {
            $lang = $w['language'] ?? null;
            if ($lang === 'english') {
                $en++;
            } elseif ($lang === 'tagalog') {
                $tl++;
            } elseif ($lang === 'taglish') {
                $taglish++;
            }
        }

        $total = $en + $tl + $taglish;
        if ($total === 0) {
            return 'english';
        }

        if ($en > 0 && $tl > 0) {
            return 'taglish';
        }
        if ($tl > $en) {
            return 'tagalog';
        }
        return 'english';
    }
}
