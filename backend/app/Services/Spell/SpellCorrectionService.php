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
        $candidateTopN = (int) config('spelling.candidate_top_n', $maxSuggestions);
        $maxDistance = (float) config('spelling.max_levenshtein_distance', 3);
        $lengthTolerance = (int) config('spelling.length_tolerance', 2);
        $minCandidateConfidence = (float) config('spelling.min_candidate_confidence', 0.38);
        $splitMinConfidence = (float) config('spelling.split_min_confidence', 0.45);
        $minContextProbability = (float) config('spelling.min_context_probability', 0.1);
        $minFrequencyCutoff = (int) config('spelling.min_frequency_cutoff', 1);
        $maxOutputWords = (int) config('spelling.max_output_words', 500);
        $autoLearnUsageThreshold = (int) config('spelling.auto_learn_usage_threshold', 3);
        $morphologyPrefixes = config('spelling.morphology_prefixes', ['maka', 'maki', 'mag', 'pag', 'nag', 'ma', 'ka', 'i', 'um']);
        $directCorrections = config('spelling.direct_corrections', []);
        $contextWeight = (float) config('spelling.context_weight', 1.35);
        $contractionExpansions = config('spelling.contraction_expansions', []);
        $sentenceLanguageHint = $this->detectSentenceLanguageHint($tokens);

        $spanAt = $this->findMultiWordDirectSpans($tokens, $directCorrections);

        $wordResults = [];
        $learningCandidates = [];
        $tokenFrequencies = $this->countNormalizedTokens($tokens);

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
            $contextualTarget = $this->selectInformalNormalizationTarget($normalized, $sentenceLanguageHint);
            $directSingleTarget = $contextualTarget ?? ($directCorrections[$normalized] ?? null);
            if (
                ! $isPhraseHead
                && is_string($directSingleTarget)
                && $directSingleTarget !== ''
                && $this->shouldApplySingleTokenNormalization($normalized, $entry, $directSingleTarget)
            ) {
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

            $morphology = $this->segmentMorphology($normalized, $morphologyPrefixes);
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

            if (isset($contractionExpansions[$normalized]) && is_array($contractionExpansions[$normalized])) {
                foreach ($contractionExpansions[$normalized] as $expanded) {
                    if (! is_string($expanded) || trim($expanded) === '') {
                        continue;
                    }
                    $expanded = trim($expanded);
                    $key = mb_strtolower($expanded);
                    if (isset($seenWords[$key])) {
                        continue;
                    }
                    $seenWords[$key] = true;
                    $contextScore = $this->contextAwareness->scoreCandidate(
                        $tokens,
                        $i,
                        $expanded,
                        $this->posTagging->tag($expanded, null)
                    );
                    $compareWord = str_replace(' ', '', $this->normalizeSuggestionTarget($expanded));
                    $dist = $compareWord !== ''
                        ? round($this->levenshtein->distance($normalized, $compareWord), 2)
                        : 1.0;
                    $scored[] = [
                        'word' => $expanded,
                        'compare_word' => $compareWord !== '' ? $compareWord : $expanded,
                        'distance' => $dist,
                        'pos' => 'Verb',
                        'frequency' => 1200,
                        'context_score' => $contextScore,
                        'rank_score' => $dist - $contextWeight * $contextScore - 0.3,
                    ];
                }
            }

            $morphologyCandidates = $this->buildMorphologyCandidates(
                $normalized,
                $morphology,
                $tokens,
                $i,
                $maxDistance,
                $minFrequencyCutoff,
                $contextWeight
            );
            foreach ($morphologyCandidates as $morphCandidate) {
                $key = mb_strtolower($morphCandidate['word']);
                if (isset($seenWords[$key])) {
                    continue;
                }
                $seenWords[$key] = true;
                $scored[] = $morphCandidate;
            }

            if ($this->shouldAttemptWordSeparation($normalized, $entry)) {
                $splitCandidates = $this->buildSplitCandidates(
                    $normalized,
                    $tokens,
                    $i,
                    $contextWeight,
                    $minFrequencyCutoff,
                    $splitMinConfidence
                );
                foreach ($splitCandidates as $splitCandidate) {
                    $key = mb_strtolower($splitCandidate['word']);
                    if (isset($seenWords[$key])) {
                        continue;
                    }
                    $seenWords[$key] = true;
                    $scored[] = $splitCandidate;
                }
            }

            foreach ($candidates as $c) {
                $compare = $c['word'];
                $d = $this->levenshtein->distance($normalized, $compare);
                if ($d <= $maxDistance) {
                    $key = mb_strtolower($c['word']);
                    if (! isset($seenWords[$key])) {
                        if (! $this->isCandidateAcceptable($normalized, $c['word'], (int) ($c['frequency'] ?? 0), $minFrequencyCutoff)) {
                            continue;
                        }
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
                            'semantic_score' => $this->semanticCompatibilityScore($tokens, $i, $c['word']),
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
                        if (! $this->isCandidateAcceptable($normalized, $w, (int) ($entry?->frequency ?? 0), $minFrequencyCutoff)) {
                            continue;
                        }
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
                            'semantic_score' => $this->semanticCompatibilityScore($tokens, $i, $w),
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
            $suggestions = $this->filterAndShapeSuggestions(
                $scored,
                $normalized,
                min($candidateTopN, $maxSuggestions),
                $minCandidateConfidence,
                $minContextProbability
            );
            foreach ($suggestions as $idx => $row) {
                $target = $row['compare_word'] ?? $row['word'];
                $breakdown = $this->levenshtein->editBreakdown($normalized, $target);
                unset($row['compare_word']);
                unset($row['rank_score']);
                unset($row['semantic_score']);
                unset($row['confidence']);
                $row['error_breakdown'] = $breakdown;
                $suggestions[$idx] = $row;
            }
            $minDistance = $suggestions[0]['distance'] ?? null;

            if (count($suggestions) === 0 && $tokenFrequencies[$normalized] >= $autoLearnUsageThreshold) {
                $learnedFrequency = $this->learnedVocabulary->recordUsage($normalized);
                if ($learnedFrequency > 0) {
                    $learningCandidates[] = ['word' => $normalized, 'frequency' => $learnedFrequency];
                }
            }

            $wordResults[] = [
                'word' => $raw,
                'normalized' => $normalized,
                'status' => count($suggestions) > 0 ? 'suggested' : 'misspelled',
                'pos' => $this->posTagging->tag($normalized, null),
                'suggestions' => $suggestions,
                'distance' => $minDistance,
                'language' => null,
                'morphology' => $morphology,
            ];
        }

        $detectedLanguage = $this->languageDetection->detect(
            array_map(fn ($r) => ['language' => $r['language']], $wordResults)
        );
        $analytics = $this->analytics->compute($wordResults, $detectedLanguage);
        $correctedText = $this->buildCorrectedText($wordResults, $maxOutputWords);

        return [
            'words' => $wordResults,
            'analytics' => $analytics,
            'language' => $detectedLanguage,
            'learning_candidates' => $learningCandidates,
            'corrected_text' => $correctedText,
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

    private function isCandidateAcceptable(string $source, string $candidate, int $frequency, int $minFrequency = 1): bool
    {
        $source = mb_strtolower($source);
        $candidate = mb_strtolower(trim($candidate));
        if ($candidate === '') {
            return false;
        }
        if (! preg_match('/^[\p{L}\p{N}\' -]+$/u', $candidate)) {
            return false;
        }
        if ($frequency < max(1, $minFrequency)) {
            return false;
        }

        $sourceLooksContracted = preg_match('/^(?:[a-z]+\'[a-z]+|[a-z]+n\'t)$/u', $source) === 1;
        if ($sourceLooksContracted) {
            $candidateHasApostrophe = str_contains($candidate, "'");
            $candidateIsExpansion = str_contains($candidate, ' ');
            if (! $candidateHasApostrophe && ! $candidateIsExpansion) {
                return false;
            }
        }

        if (mb_strlen($source) >= 6 && mb_strlen($candidate) <= 2) {
            return false;
        }

        return true;
    }

    /**
     * @param  array<int, array{raw: string, normalized: string}>  $tokens
     * @return array<string, int>
     */
    private function countNormalizedTokens(array $tokens): array
    {
        $counts = [];
        foreach ($tokens as $token) {
            $word = $token['normalized'];
            if ($word === '') {
                continue;
            }
            $counts[$word] = ($counts[$word] ?? 0) + 1;
        }

        return $counts;
    }

    /**
     * @param  array<int, string>  $prefixes
     * @return array{original: string, prefix: ?string, root: string, is_hybrid_taglish: bool}
     */
    private function segmentMorphology(string $word, array $prefixes): array
    {
        $normalized = mb_strtolower(trim($word));
        $orderedPrefixes = array_values(array_unique(array_filter($prefixes, fn ($p) => is_string($p) && $p !== '')));
        usort($orderedPrefixes, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));

        foreach ($orderedPrefixes as $prefix) {
            if (! str_starts_with($normalized, $prefix)) {
                continue;
            }

            $root = mb_substr($normalized, mb_strlen($prefix));
            $root = ltrim($root, '-');
            $root = preg_replace('/^co-?/u', '', $root) ?? $root;
            if ($root === '' || mb_strlen($root) < 2) {
                continue;
            }

            return [
                'original' => $normalized,
                'prefix' => $prefix,
                'root' => $root,
                'is_hybrid_taglish' => preg_match('/[a-z]/u', $root) === 1,
            ];
        }

        return [
            'original' => $normalized,
            'prefix' => null,
            'root' => $normalized,
            'is_hybrid_taglish' => false,
        ];
    }

    /**
     * @param  array{prefix: ?string, root: string, is_hybrid_taglish: bool}  $morphology
     * @param  array<int, array{raw: string, normalized: string}>  $tokens
     * @return array<int, array{word: string, compare_word: string, distance: float, pos: string, frequency: int, context_score: float, rank_score: float, semantic_score: float, morphology: array{prefix_distance: float, root_distance: float}}>
     */
    private function buildMorphologyCandidates(
        string $source,
        array $morphology,
        array $tokens,
        int $index,
        float $maxDistance,
        int $minFrequencyCutoff,
        float $contextWeight
    ): array {
        $prefix = $morphology['prefix'] ?? null;
        $root = $morphology['root'] ?? '';
        if ($prefix === null || $root === '') {
            return [];
        }

        $prefixDistance = $this->levenshtein->distance($prefix, $prefix);
        if ($prefixDistance > 1.0) {
            return [];
        }

        $rootCandidates = $this->dictionary->getCandidates($root, 2, 25);
        $out = [];
        foreach ($rootCandidates as $candidate) {
            $candidateRoot = $candidate['word'] ?? '';
            if ($candidateRoot === '') {
                continue;
            }
            $rootDistance = $this->levenshtein->distance($root, $candidateRoot);
            if ($rootDistance > $maxDistance) {
                continue;
            }
            $frequency = (int) ($candidate['frequency'] ?? 0);
            if ($frequency < $minFrequencyCutoff) {
                continue;
            }

            $rebuilt = $prefix.$candidateRoot;
            if (! $this->isCandidateAcceptable($source, $rebuilt, $frequency, $minFrequencyCutoff)) {
                continue;
            }
            $candidatePos = $candidate['pos'] ?? $this->posTagging->tag($rebuilt, null);
            $contextScore = $this->contextAwareness->scoreCandidate($tokens, $index, $rebuilt, $candidatePos);
            $semanticScore = $this->semanticCompatibilityScore($tokens, $index, $rebuilt);
            $distance = round($prefixDistance + $rootDistance, 2);
            $rankScore = $distance - $contextWeight * $contextScore - 0.7 * $semanticScore;

            $out[] = [
                'word' => $rebuilt,
                'compare_word' => $rebuilt,
                'distance' => $distance,
                'pos' => $candidatePos,
                'frequency' => $frequency,
                'context_score' => $contextScore,
                'rank_score' => $rankScore,
                'semantic_score' => $semanticScore,
                'morphology' => [
                    'prefix_distance' => round($prefixDistance, 2),
                    'root_distance' => round($rootDistance, 2),
                ],
            ];
        }

        return $out;
    }

    /**
     * @param  array<int, array{word: string, compare_word?: string, distance: float, pos: string, frequency: int, context_score: float, rank_score?: float, semantic_score?: float}>  $scored
     * @return array<int, array{word: string, compare_word: string, distance: float, pos: string, frequency: int, context_score: float, rank_score: float, semantic_score: float, confidence: float}>
     */
    private function filterAndShapeSuggestions(
        array $scored,
        string $sourceWord,
        int $limit,
        float $minConfidence,
        float $minContextProbability
    ): array {
        $out = [];
        $sourceLen = max(1, mb_strlen($sourceWord));

        foreach ($scored as $row) {
            $distance = (float) ($row['distance'] ?? 0.0);
            $contextScore = (float) ($row['context_score'] ?? 0.0);
            $frequency = (int) ($row['frequency'] ?? 0);
            $semanticScore = (float) ($row['semantic_score'] ?? 0.0);

            $levenshteinSimilarity = max(0.0, 1.0 - ($distance / $sourceLen));
            $frequencyScore = min(1.0, log(1 + max(1, $frequency), 10));
            $contextProbability = max(0.0, min(1.0, ($contextScore + 1.0) / 2.0));
            $semanticCompatibility = max(0.0, min(1.0, $semanticScore));
            $confidence = (0.35 * $levenshteinSimilarity) + (0.25 * $frequencyScore) + (0.25 * $contextProbability) + (0.15 * $semanticCompatibility);

            if ($contextProbability < $minContextProbability || $confidence < $minConfidence) {
                continue;
            }

            $row['compare_word'] = $row['compare_word'] ?? $row['word'];
            $row['rank_score'] = (float) ($row['rank_score'] ?? $distance);
            $row['semantic_score'] = $semanticScore;
            $row['confidence'] = round($confidence, 4);
            $out[] = $row;
        }

        usort($out, function ($a, $b) {
            $confidenceCmp = ($b['confidence'] ?? 0.0) <=> ($a['confidence'] ?? 0.0);
            if ($confidenceCmp !== 0) {
                return $confidenceCmp;
            }

            $rankCmp = ($a['rank_score'] ?? 0.0) <=> ($b['rank_score'] ?? 0.0);
            if ($rankCmp !== 0) {
                return $rankCmp;
            }

            return ($b['frequency'] ?? 0) <=> ($a['frequency'] ?? 0);
        });

        return array_slice($out, 0, max(1, $limit));
    }

    /**
     * Lightweight semantic compatibility: encourage valid surrounding lexical transitions.
     *
     * @param  array<int, array{raw: string, normalized: string}>  $tokens
     */
    private function semanticCompatibilityScore(array $tokens, int $index, string $candidate): float
    {
        $score = 0.5;
        $prev = $index > 0 ? $tokens[$index - 1]['normalized'] : null;
        $next = $index < count($tokens) - 1 ? $tokens[$index + 1]['normalized'] : null;
        $candidate = mb_strtolower($candidate);

        if ($prev !== null && in_array($prev, ['mag', 'nag', 'pag', 'maki', 'maka'], true)) {
            $score += preg_match('/^[a-z]+(?:-[a-z]+)*$/u', $candidate) === 1 ? 0.25 : -0.2;
        }
        if ($next !== null && in_array($next, ['ako', 'ka', 'siya', 'kami', 'kayo', 'sila'], true)) {
            $score += str_contains(mb_strtolower($this->posTagging->tag($candidate, null)), 'verb') ? 0.15 : -0.1;
        }

        return max(0.0, min(1.0, $score));
    }

    /**
     * @param  array<int, array{raw: string, normalized: string}>  $tokens
     */
    private function detectSentenceLanguageHint(array $tokens): string
    {
        $english = 0;
        $tagalog = 0;

        foreach ($tokens as $token) {
            $entry = $this->dictionary->find($token['normalized']);
            if ($entry?->language === 'english') {
                $english++;
            } elseif ($entry?->language === 'tagalog') {
                $tagalog++;
            }
        }

        if ($english > 0 && $tagalog > 0) {
            return 'taglish';
        }

        return $tagalog > $english ? 'tagalog' : 'english';
    }

    private function selectInformalNormalizationTarget(string $normalized, string $sentenceLanguage): ?string
    {
        $map = config('spelling.informal_normalizations', []);
        $entry = $map[$normalized] ?? null;
        if (! is_array($entry)) {
            return null;
        }

        $candidate = $entry[$sentenceLanguage] ?? $entry['default'] ?? null;
        return is_string($candidate) && trim($candidate) !== '' ? trim($candidate) : null;
    }

    private function shouldApplySingleTokenNormalization(string $source, mixed $dictionaryEntry, string $target): bool
    {
        $source = mb_strtolower($source);
        $preservedForms = config('spelling.preserve_standard_forms', []);
        if (in_array($source, $preservedForms, true)) {
            return false;
        }
        if ($dictionaryEntry === null) {
            return true;
        }

        $force = config('spelling.force_normalize_lexemes', []);
        if (in_array($source, $force, true)) {
            return true;
        }

        if (str_contains($target, "'") && ! str_contains($source, "'")) {
            return true;
        }

        return false;
    }

    private function shouldAttemptWordSeparation(string $normalized, mixed $entry): bool
    {
        if ($entry !== null) {
            return false;
        }
        if (mb_strlen($normalized) < 5) {
            return false;
        }
        if (str_contains($normalized, '-') || str_contains($normalized, "'")) {
            return false;
        }
        $preservedForms = config('spelling.preserve_standard_forms', []);
        if (in_array($normalized, $preservedForms, true)) {
            return false;
        }
        if ($this->learnedVocabulary->isProtected($normalized)) {
            return false;
        }

        $looksMorphological = preg_match('/^(mag|nag|pag|maka|maki|ma|ka|i|um)[a-z]{3,}$/u', $normalized) === 1;
        return ! $looksMorphological;
    }

    /**
     * @param  array<int, array{raw: string, normalized: string}>  $tokens
     * @return array<int, array{word: string, compare_word: string, distance: float, pos: string, frequency: int, context_score: float, rank_score: float, semantic_score: float}>
     */
    private function buildSplitCandidates(
        string $source,
        array $tokens,
        int $index,
        float $contextWeight,
        int $minFrequencyCutoff,
        float $splitMinConfidence
    ): array {
        $source = mb_strtolower($source);
        $len = mb_strlen($source);
        $results = [];

        for ($cut = 2; $cut <= $len - 2; $cut++) {
            $left = mb_substr($source, 0, $cut);
            $right = mb_substr($source, $cut);
            if ($left === '' || $right === '') {
                continue;
            }

            $leftEntry = $this->dictionary->find($left);
            $rightEntry = $this->dictionary->find($right);
            if ($leftEntry === null || $rightEntry === null) {
                continue;
            }

            $frequency = min((int) $leftEntry->frequency, (int) $rightEntry->frequency);
            if ($frequency < $minFrequencyCutoff) {
                continue;
            }

            $joined = $left.' '.$right;
            $distance = $this->levenshtein->distance($source, $left.$right);
            $leftPos = $leftEntry->pos ?? $this->posTagging->tag($left, null);
            $rightPos = $rightEntry->pos ?? $this->posTagging->tag($right, null);
            $pos = $leftPos.'/'.$rightPos;
            $contextScore = $this->contextAwareness->scoreCandidate($tokens, $index, $left, $leftPos);
            $semanticScore = $this->semanticCompatibilityScore($tokens, $index, $joined);

            $confidence = min(
                1.0,
                (0.4 * max(0.0, 1.0 - ($distance / max(1, $len))))
                + (0.35 * max(0.0, min(1.0, ($contextScore + 1.0) / 2.0)))
                + (0.25 * min(1.0, log(1 + $frequency, 10)))
            );
            if ($confidence < $splitMinConfidence) {
                continue;
            }

            $rankScore = round($distance, 2) - ($contextWeight * $contextScore) - (0.7 * $semanticScore) - 0.15;
            $results[] = [
                'word' => $joined,
                'compare_word' => str_replace(' ', '', $joined),
                'distance' => round($distance, 2),
                'pos' => $pos,
                'frequency' => $frequency,
                'context_score' => $contextScore,
                'rank_score' => $rankScore,
                'semantic_score' => $semanticScore,
            ];
        }

        return $results;
    }

    /**
     * @param  array<int, array<string, mixed>>  $wordResults
     */
    private function buildCorrectedText(array $wordResults, int $maxOutputWords): string
    {
        $out = [];
        foreach ($wordResults as $row) {
            if (($row['phrase_join'] ?? false) === true) {
                continue;
            }
            $replacement = $row['word'] ?? '';
            if (($row['status'] ?? '') === 'suggested' && ! empty($row['suggestions'][0]['word'])) {
                $replacement = (string) $row['suggestions'][0]['word'];
            }
            if ($replacement === '') {
                continue;
            }
            $parts = preg_split('/\s+/u', trim((string) $replacement));
            if ($parts === false) {
                continue;
            }
            foreach ($parts as $p) {
                if ($p !== '') {
                    $out[] = $p;
                }
            }
        }

        if (count($out) > $maxOutputWords) {
            $out = array_slice($out, 0, $maxOutputWords);
        }

        return $this->applySentenceFormatting(implode(' ', $out));
    }

    private function applySentenceFormatting(string $text): string
    {
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
        if ($text === '') {
            return '';
        }

        // Use numeric flag to avoid runtime issues resolving SPLIT constants in some PHP builds.
        $sentences = preg_split('/([.!?]\s*)/u', $text, -1, 2);
        if ($sentences === false) {
            return $text;
        }

        $rebuilt = '';
        for ($i = 0; $i < count($sentences); $i += 2) {
            $chunk = trim($sentences[$i] ?? '');
            if ($chunk === '') {
                continue;
            }
            $chunk = mb_strtoupper(mb_substr($chunk, 0, 1)).mb_substr($chunk, 1);
            $rebuilt .= ($rebuilt === '' ? '' : ' ').$chunk;
            if (isset($sentences[$i + 1])) {
                $rebuilt .= $sentences[$i + 1];
            }
        }

        return trim($rebuilt);
    }
}
