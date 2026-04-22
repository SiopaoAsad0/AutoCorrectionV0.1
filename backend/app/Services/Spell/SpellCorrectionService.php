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
        private ThesaurusService $thesaurus,
        private ContextAwarenessService $contextAwareness,
        private LearnedVocabularyService $learnedVocabulary
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
        $contextWeight = (float) config('spelling.context_weight', 1.35);

        $spanAt = $this->findMultiWordDirectSpans($tokens, $directCorrections);

        $wordResults = [];

        $tokenCount = count($tokens);
        for ($i = 0; $i < $tokenCount; $i++) {
            $span = $spanAt[$i] ?? null;
            $token = $tokens[$i];
            $raw = $token['raw'];
            $normalized = $token['normalized'];

            if ($span !== null && ! ($span['is_head'] ?? false)) {
                $wordResults[] = [
                    'word' => $raw,
                    'normalized' => $normalized,
                    'status' => 'correct',
                    'pos' => $this->posTagging->tag($normalized, null),
                    'suggestions' => [],
                    'distance' => null,
                    'language' => null,
                    'phrase_join' => true,
                ];
                continue;
            }

            $isPhraseHead = $span !== null && ($span['is_head'] ?? false);
            $entry = $this->dictionary->find($normalized);
            $dictPos = $entry?->pos;
            $language = $entry?->language;

            // High-priority single-token normalizations (e.g. diko -> hindi ko) should still trigger
            // even when the source token exists in the dictionary.
            $directSingleTarget = $directCorrections[$normalized] ?? null;
            if (! $isPhraseHead && is_string($directSingleTarget) && $directSingleTarget !== '') {
                $normalizedTarget = $this->normalizeSuggestionTarget($directSingleTarget);
                if ($normalizedTarget !== '' && $normalizedTarget !== $normalized) {
                    $targetEntry = $this->dictionary->find($normalizedTarget);
                    $targetPos = $targetEntry?->pos ?? $this->posTagging->tag($directSingleTarget, null);
                    $contextScore = $this->contextAwareness->scoreCandidate($tokens, $i, $directSingleTarget, $targetPos);
                    $wordResults[] = [
                        'word' => $raw,
                        'normalized' => $normalized,
                        'status' => 'suggested',
                        'pos' => $this->posTagging->tag($normalized, $dictPos),
                        'suggestions' => [[
                            'word' => $directSingleTarget,
                            'distance' => 0.0,
                            'pos' => $targetPos,
                            'frequency' => $targetEntry ? (int) $targetEntry->frequency + 1000 : 1000,
                            'context_score' => $contextScore,
                            'error_breakdown' => $this->levenshtein->editBreakdown($normalized, $directSingleTarget),
                        ]],
                        'distance' => 0.0,
                        'language' => $language,
                    ];
                    continue;
                }
            }

            $protectedLexeme = ! $isPhraseHead && $entry === null && $this->learnedVocabulary->isProtected($normalized);
            if ($protectedLexeme) {
                $wordResults[] = [
                    'word' => $raw,
                    'normalized' => $normalized,
                    'status' => 'correct',
                    'pos' => $this->posTagging->tag($normalized, null),
                    'suggestions' => [],
                    'distance' => null,
                    'language' => 'taglish',
                    'learned_or_slang' => true,
                ];
                continue;
            }

            if ($entry !== null && ! $isPhraseHead) {
                $wordResults[] = [
                    'word' => $raw,
                    'normalized' => $normalized,
                    'status' => 'correct',
                    'pos' => $this->posTagging->tag($normalized, $dictPos),
                    'suggestions' => [],
                    'distance' => null,
                    'language' => $language,
                ];
                continue;
            }

            if ($isPhraseHead) {
                $directTarget = $span['target'];
                $normalizedTarget = $this->normalizeSuggestionTarget($directTarget);
                $targetEntry = $normalizedTarget !== '' ? $this->dictionary->find($normalizedTarget) : null;
                $targetPos = $targetEntry?->pos ?? $this->posTagging->tag($directTarget, null);
                $contextScore = $this->contextAwareness->scoreCandidate($tokens, $i, $directTarget, $targetPos);
                $row = [
                    'word' => $directTarget,
                    'distance' => 0.0,
                    'pos' => $targetPos,
                    'frequency' => $targetEntry ? (int) $targetEntry->frequency + 1000 : 1000,
                    'context_score' => $contextScore,
                ];
                $fromPhrase = $this->joinNormalizedPhrase($tokens, $i, (int) $span['len']);
                $row['error_breakdown'] = $this->levenshtein->editBreakdown($fromPhrase, $directTarget);
                $suggestions = [$row];

                $wordResults[] = [
                    'word' => $raw,
                    'normalized' => $normalized,
                    'status' => 'suggested',
                    'pos' => $this->posTagging->tag($normalized, null),
                    'suggestions' => $suggestions,
                    'distance' => 0.0,
                    'language' => $targetEntry?->language,
                    'phrase_span' => (int) $span['len'],
                ];
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
            $phraseKey3 = $phraseKey;
            if ($i + 2 < $tokenCount) {
                $phraseKey3 = trim($normalized.' '.$tokens[$i + 1]['normalized'].' '.$tokens[$i + 2]['normalized']);
            }

            $directTarget = $directCorrections[$phraseKey3] ?? $directCorrections[$phraseKey] ?? $directCorrections[$normalized] ?? null;
            if (is_string($directTarget) && $directTarget !== '') {
                $normalizedTarget = $this->normalizeSuggestionTarget($directTarget);
                $targetEntry = $normalizedTarget !== '' ? $this->dictionary->find($normalizedTarget) : null;
                $seenWords[mb_strtolower($directTarget)] = true;
                $targetPos = $targetEntry?->pos ?? $this->posTagging->tag($directTarget, null);
                $contextScore = $this->contextAwareness->scoreCandidate($tokens, $i, $directTarget, $targetPos);
                $scored[] = [
                    'word' => $directTarget,
                    'compare_word' => $normalizedTarget !== '' ? $normalizedTarget : $directTarget,
                    'distance' => 0.0,
                    'pos' => $targetPos,
                    'frequency' => $targetEntry ? (int) $targetEntry->frequency + 1000 : 1000,
                    'context_score' => $contextScore,
                    'rank_score' => 0.0 - $contextWeight * $contextScore,
                ];
            }

            foreach ($candidates as $c) {
                $compare = $c['word'];
                $d = $this->levenshtein->distance($normalized, $compare);
                if ($d <= $maxDistance) {
                    $key = mb_strtolower($c['word']);
                    if (! isset($seenWords[$key])) {
                        $seenWords[$key] = true;
                        $candidatePos = $c['pos'] ?? $this->posTagging->tag($c['word'], $c['pos'] ?? null);
                        $contextScore = $this->contextAwareness->scoreCandidate($tokens, $i, $c['word'], $candidatePos);
                        $scored[] = [
                            'word' => $c['word'],
                            'compare_word' => $compare,
                            'distance' => round($d, 2),
                            'pos' => $candidatePos,
                            'frequency' => $c['frequency'],
                            'context_score' => $contextScore,
                            'rank_score' => round($d, 2) - $contextWeight * $contextScore,
                        ];
                    }
                }
            }

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
                        $candidatePos = $entry?->pos ?? $this->posTagging->tag($w, null);
                        $contextScore = $this->contextAwareness->scoreCandidate($tokens, $i, $w, $candidatePos);
                        $scored[] = [
                            'word' => $w,
                            'compare_word' => $key,
                            'distance' => round($dist, 2),
                            'pos' => $candidatePos,
                            'frequency' => $entry ? (int) $entry->frequency : 0,
                            'context_score' => $contextScore,
                            'rank_score' => round($dist, 2) - $contextWeight * $contextScore,
                        ];
                    }
                }
            }

            usort($scored, function ($a, $b) {
                $cmp = ($a['rank_score'] ?? $a['distance']) <=> ($b['rank_score'] ?? $b['distance']);
                if ($cmp !== 0) {
                    return $cmp;
                }

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
                unset($row['rank_score']);
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

    /**
     * Map token index to multi-word direct_corrections spans (longest match first).
     *
     * @param  array<int, array{raw: string, normalized: string}>  $tokens
     * @return array<int, array{is_head: bool, len?: int, target?: string, head_index?: int}|null>
     */
    private function findMultiWordDirectSpans(array $tokens, array $directCorrections): array
    {
        $multiKeys = [];
        foreach ($directCorrections as $key => $target) {
            if (! is_string($key) || ! str_contains($key, ' ')) {
                continue;
            }
            $parts = preg_split('/\s+/u', trim($key));
            if ($parts === false || count($parts) < 2) {
                continue;
            }
            $normParts = [];
            foreach ($parts as $p) {
                $normParts[] = $this->normalizeSuggestionTarget($p);
            }
            if (in_array('', $normParts, true)) {
                continue;
            }
            $multiKeys[] = ['parts' => $normParts, 'target' => is_string($target) ? $target : '', 'len' => count($normParts)];
        }

        usort($multiKeys, fn ($a, $b) => $b['len'] <=> $a['len']);

        $n = count($tokens);
        $spanAt = array_fill(0, $n, null);
        $claimed = array_fill(0, $n, false);

        for ($i = 0; $i < $n; $i++) {
            if ($claimed[$i]) {
                continue;
            }
            foreach ($multiKeys as $mk) {
                $len = $mk['len'];
                if ($i + $len > $n || $mk['target'] === '') {
                    continue;
                }
                $ok = true;
                for ($k = 0; $k < $len; $k++) {
                    if ($tokens[$i + $k]['normalized'] !== $mk['parts'][$k]) {
                        $ok = false;
                        break;
                    }
                }
                if (! $ok) {
                    continue;
                }
                for ($k = 0; $k < $len; $k++) {
                    $claimed[$i + $k] = true;
                }
                $spanAt[$i] = [
                    'is_head' => true,
                    'len' => $len,
                    'target' => $mk['target'],
                ];
                for ($k = 1; $k < $len; $k++) {
                    $spanAt[$i + $k] = [
                        'is_head' => false,
                        'len' => $len,
                        'target' => $mk['target'],
                        'head_index' => $i,
                    ];
                }
                break;
            }
        }

        return $spanAt;
    }

    /**
     * @param  array<int, array{raw: string, normalized: string}>  $tokens
     */
    private function joinNormalizedPhrase(array $tokens, int $start, int $len): string
    {
        $parts = [];
        for ($k = 0; $k < $len; $k++) {
            $parts[] = $tokens[$start + $k]['normalized'];
        }

        return implode(' ', $parts);
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
