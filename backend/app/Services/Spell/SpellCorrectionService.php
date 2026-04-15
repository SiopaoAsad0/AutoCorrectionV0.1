<?php

namespace App\Services\Spell;

class SpellCorrectionService
{
    public function __construct(
        private TokenizationService $tokenization,
        private DictionaryService $dictionary,
        private AdaptedLevenshteinService $levenshtein,
        private POSTaggingService $posTagging,
        private LanguageDetectionService $languageDetection,
        private SentenceAnalyticsService $analytics,
        private ThesaurusService $thesaurus
    ) {}

    /**
     * Run full spell correction pipeline and return words + analytics.
     */
    public function correct(string $text): array
    {
        $tokens = $this->tokenization->tokenize($text);
        $maxSuggestions = (int) config('spelling.max_suggestions', 5);
        $maxDistance = (float) config('spelling.max_levenshtein_distance', 3);
        $lengthTolerance = (int) config('spelling.length_tolerance', 2);
        $directCorrections = config('spelling.direct_corrections', []);

        $wordResults = [];
        $wordLanguageMap = [];

        $tokenCount = count($tokens);
        for ($i = 0; $i < $tokenCount; $i++) {
            $token = $tokens[$i];
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
            $seenWords = [];

            $phraseKey = $normalized;
            if ($i + 1 < $tokenCount) {
                $nextNormalized = $tokens[$i + 1]['normalized'];
                $phraseKey = trim($normalized.' '.$nextNormalized);
            }

            $directTarget = $directCorrections[$phraseKey] ?? $directCorrections[$normalized] ?? null;
            if (is_string($directTarget) && $directTarget !== '') {
                $normalizedTarget = $this->normalizeSuggestionTarget($directTarget);
                $targetEntry = $normalizedTarget !== '' ? $this->dictionary->find($normalizedTarget) : null;
                $seenWords[mb_strtolower($directTarget)] = true;
                $scored[] = [
                    'word' => $directTarget,
                    'compare_word' => $normalizedTarget !== '' ? $normalizedTarget : $directTarget,
                    'distance' => 0.0,
                    'pos' => $targetEntry?->pos ?? $this->posTagging->tag($directTarget, null),
                    'frequency' => $targetEntry ? (int) $targetEntry->frequency + 1000 : 1000,
                ];
            }

            foreach ($candidates as $c) {
                $compare = $c['word'];
                $d = $this->levenshtein->distance($normalized, $compare);
                if ($d <= $maxDistance) {
                    $key = mb_strtolower($c['word']);
                    if (! isset($seenWords[$key])) {
                        $seenWords[$key] = true;
                        $scored[] = [
                            'word' => $c['word'],
                            'compare_word' => $compare,
                            'distance' => round($d, 2),
                            'pos' => $c['pos'] ?? $this->posTagging->tag($c['word'], $c['pos'] ?? null),
                            'frequency' => $c['frequency'],
                        ];
                    }
                }
            }

            // Also pull Datamuse synonyms / near-meanings when the list is not full yet (e.g. movie → film, theater).
            if (count($scored) < $maxSuggestions + 2 && $this->shouldUseThesaurus($normalized)) {
                $thesaurusCandidates = $this->thesaurus->getSuggestions($normalized);
                foreach ($thesaurusCandidates as $th) {
                    $w = $th['word'] ?? null;
                    if ($w === null) {
                        continue;
                    }
                    $key = mb_strtolower($w);
                    if (isset($seenWords[$key])) {
                        continue;
                    }
                    $entry = $this->dictionary->find($key);
                    $dist = $this->levenshtein->distance($normalized, $key);
                    if ($dist <= $maxDistance + 1) {
                        $seenWords[$key] = true;
                        $scored[] = [
                            'word' => $w,
                            'compare_word' => $key,
                            'distance' => round($dist, 2),
                            'pos' => $entry?->pos ?? $this->posTagging->tag($w, null),
                            'frequency' => $entry ? (int) $entry->frequency : 0,
                        ];
                    }
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
            foreach ($suggestions as $idx => $row) {
                $target = $row['compare_word'] ?? $row['word'];
                $breakdown = $this->levenshtein->editBreakdown($normalized, $target);
                unset($row['compare_word']);
                $row['error_breakdown'] = $breakdown;
                $suggestions[$idx] = $row;
            }
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

    private function shouldUseThesaurus(string $normalizedWord): bool
    {
        if (! config('spelling.use_thesaurus', true)) {
            return false;
        }
        if (mb_strlen($normalizedWord) < 3) {
            return false;
        }

        return (bool) preg_match('/^[a-z\'-]+$/u', $normalizedWord);
    }

    private function normalizeSuggestionTarget(string $word): string
    {
        $lower = mb_strtolower($word);
        return preg_replace('/[^\p{L}\p{N}\'-]/u', '', $lower) ?? '';
    }
}
