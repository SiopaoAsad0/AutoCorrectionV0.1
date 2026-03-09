<?php

namespace App\Services\Spell;

class SpellCorrectionService
{
    public function __construct(
        private TokenizationService $tokenization,
        private DictionaryService $dictionary,
        private WeightedLevenshteinService $levenshtein,
        private POSTaggingService $posTagging,
        private LanguageDetectionService $languageDetection,
        private SentenceAnalyticsService $analytics
    ) {
    }

    /**
     * Run full spell correction pipeline and return words + analytics.
     */
    public function correct(string $text): array
    {
        $tokens = $this->tokenization->tokenize($text);
        $maxSuggestions = (int) config('spelling.max_suggestions', 5);
        $maxDistance = (float) config('spelling.max_levenshtein_distance', 3);
        $lengthTolerance = (int) config('spelling.length_tolerance', 2);

        $wordResults = [];
        $wordLanguageMap = [];

        foreach ($tokens as $token) {
            $raw = $token['raw'];
            $normalized = $token['normalized'];
            $entry = $this->dictionary->find($normalized);
            $dictPos = $entry?->pos;
            $language = $entry?->language;

            if ($entry !== null) {
                $wordResults[] = [
                    'word' => $raw,
                    'normalized' => $normalized,
                    'status' => 'correct',
                    'pos' => $this->posTagging->tag($normalized, $dictPos),
                    'suggestions' => [],
                    'distance' => null,
                    'language' => $language,
                ];
                $wordLanguageMap[] = ['language' => $language];
                continue;
            }

            $candidates = $this->dictionary->getCandidates($normalized, $lengthTolerance, $maxSuggestions * 3);
            $scored = [];
            foreach ($candidates as $c) {
                $d = $this->levenshtein->distance($normalized, $c['word']);
                if ($d <= $maxDistance) {
                    $scored[] = [
                        'word' => $c['word'],
                        'distance' => round($d, 2),
                        'pos' => $c['pos'] ?? $this->posTagging->tag($c['word'], $c['pos'] ?? null),
                        'frequency' => $c['frequency'],
                    ];
                }
            }
            usort($scored, function ($a, $b) {
                $cmp = $a['distance'] <=> $b['distance'];
                if ($cmp !== 0) {
                    return $cmp;
                }
                return $b['frequency'] <=> $a['frequency'];
            });
            $suggestions = array_slice($scored, 0, $maxSuggestions);
            $minDistance = $suggestions[0]['distance'] ?? null;

            $wordResults[] = [
                'word' => $raw,
                'normalized' => $normalized,
                'status' => count($suggestions) > 0 ? 'suggested' : 'misspelled',
                'pos' => $this->posTagging->tag($normalized, null),
                'suggestions' => $suggestions,
                'distance' => $minDistance,
                'language' => null,
            ];
            $wordLanguageMap[] = ['language' => null];
        }

        $detectedLanguage = $this->languageDetection->detect(
            array_map(fn ($r) => ['language' => $r['language']], $wordResults)
        );
        $analytics = $this->analytics->compute($wordResults, $detectedLanguage);

        return [
            'words' => $wordResults,
            'analytics' => $analytics,
            'language' => $detectedLanguage,
        ];
    }
}
