<?php

namespace App\Services\Spell;

/**
 * Heuristic next-word suggestions (n-gram-style seeds + learned lexeme boost).
 * Replaceable with an LM / transformer service later.
 */
class NextWordPredictionService
{
    public function __construct(
        private TokenizationService $tokenization
    ) {}

    /**
     * @return array<int, array{word: string, score: float, source: string}>
     */
    public function predict(string $text): array
    {
        $tokens = $this->tokenization->tokenize(trim($text));
        if ($tokens === []) {
            return [];
        }

        $norm = array_map(fn ($t) => mb_strtolower($t['normalized']), $tokens);
        $candidates = [];

        $push = function (string $w, float $score, string $source) use (&$candidates): void {
            $k = mb_strtolower($w);
            if ($k === '') {
                return;
            }
            if (! isset($candidates[$k])) {
                $candidates[$k] = ['word' => $w, 'score' => $score, 'source' => $source];
            } else {
                $candidates[$k]['score'] = max($candidates[$k]['score'], $score);
            }
        };

        for ($take = min(5, count($norm)); $take >= 1; $take--) {
            $key = implode(' ', array_slice($norm, -$take));
            $bigrams = config('spelling.prediction_bigrams', []);
            if (isset($bigrams[$key]) && is_array($bigrams[$key])) {
                foreach ($bigrams[$key] as $w) {
                    if (is_string($w) && $w !== '') {
                        $push($w, 1.0 + $take * 0.05, 'bigram');
                    }
                }
            }
        }

        $last = $norm[count($norm) - 1];
        $seeds = config('spelling.prediction_seeds', []);
        if (isset($seeds[$last]) && is_array($seeds[$last])) {
            foreach ($seeds[$last] as $w) {
                if (is_string($w) && $w !== '') {
                    $push($w, 0.75, 'seed');
                }
            }
        }

        $out = array_values($candidates);
        usort($out, fn ($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($out, 0, 12);
    }
}
