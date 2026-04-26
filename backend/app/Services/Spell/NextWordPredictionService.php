<?php

namespace App\Services\Spell;

/**
 * Heuristic next-word suggestions (n-gram-style seeds + learned lexeme boost).
 * Replaceable with an LM / transformer service later.
 */
class NextWordPredictionService
{
    /** @var array<string, bool> */
    private array $wordValidationCache = [];

    public function __construct(
        private TokenizationService $tokenization,
        private DictionaryService $dictionary
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
        $trigrams = config('spelling.prediction_trigrams', []);
        $bigrams = config('spelling.prediction_bigrams', []);
        $seeds = config('spelling.prediction_seeds', []);
        $maxResults = (int) config('spelling.max_suggestions', 5) + 7;

        $push = function (string $w, float $score, string $source) use (&$candidates): void {
            $k = mb_strtolower($w);
            if ($k === '') {
                return;
            }
            if (! $this->isPredictionWordAllowed($w)) {
                return;
            }
            if (! isset($candidates[$k])) {
                $candidates[$k] = ['word' => $w, 'score' => $score, 'source' => $source];
            } else {
                $candidates[$k]['score'] = max($candidates[$k]['score'], $score);
            }
        };

        for ($take = min(4, count($norm)); $take >= 2; $take--) {
            $key = implode(' ', array_slice($norm, -$take));
            if (isset($trigrams[$key]) && is_array($trigrams[$key])) {
                foreach ($trigrams[$key] as $w) {
                    if (is_string($w) && $w !== '') {
                        $push($w, 1.15 + $take * 0.08, 'trigram');
                    }
                }
            }
        }

        for ($take = min(5, count($norm)); $take >= 1; $take--) {
            $key = implode(' ', array_slice($norm, -$take));
            if (isset($bigrams[$key]) && is_array($bigrams[$key])) {
                foreach ($bigrams[$key] as $w) {
                    if (is_string($w) && $w !== '') {
                        $push($w, 1.0 + $take * 0.05, 'bigram');
                    }
                }
            }
        }

        $last = $norm[count($norm) - 1];
        if (isset($seeds[$last]) && is_array($seeds[$last])) {
            foreach ($seeds[$last] as $w) {
                if (is_string($w) && $w !== '') {
                    $push($w, 0.75, 'seed');
                }
            }
        }

        $out = array_values($candidates);
        if (count($out) < $maxResults) {
            $detectedLanguages = $this->detectLikelyLanguages($norm);
            $fallbackRows = $this->dictionary->getTopFrequent($detectedLanguages, $maxResults * 3);
            foreach ($fallbackRows as $row) {
                $word = (string) ($row['word'] ?? '');
                if ($word === '') {
                    continue;
                }
                $k = mb_strtolower($word);
                if (isset($candidates[$k])) {
                    continue;
                }
                if (! $this->isPredictionWordAllowed($word)) {
                    continue;
                }
                $score = 0.55 + min(0.4, log(1 + max(1, (int) ($row['frequency'] ?? 1)), 10) / 3);
                $candidates[$k] = ['word' => $word, 'score' => round($score, 4), 'source' => 'global_frequency'];
            }
            $out = array_values($candidates);
        }
        usort($out, fn ($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($out, 0, $maxResults);
    }

    /**
     * @param  array<int, string>  $normalizedTokens
     * @return array<int, string>
     */
    private function detectLikelyLanguages(array $normalizedTokens): array
    {
        $english = 0;
        $tagalog = 0;

        foreach ($normalizedTokens as $token) {
            $entry = $this->dictionary->find($token);
            if ($entry?->language === 'english') {
                $english++;
            } elseif ($entry?->language === 'tagalog') {
                $tagalog++;
            }
        }

        if ($english > 0 && $tagalog > 0) {
            return ['english', 'tagalog', 'taglish'];
        }
        if ($tagalog > $english) {
            return ['tagalog', 'taglish', 'english'];
        }

        return ['english', 'taglish', 'tagalog'];
    }

    private function isPredictionWordAllowed(string $word): bool
    {
        $candidate = mb_strtolower(trim($word));
        if ($candidate === '' || preg_match('/\s/u', $candidate) === 1) {
            return false;
        }
        if (preg_match('/^[\p{L}\p{N}\'-]+$/u', $candidate) !== 1) {
            return false;
        }
        if (isset($this->wordValidationCache[$candidate])) {
            return $this->wordValidationCache[$candidate];
        }

        $isKnown = $this->dictionary->find($candidate) !== null;
        $this->wordValidationCache[$candidate] = $isKnown;

        return $isKnown;
    }
}
