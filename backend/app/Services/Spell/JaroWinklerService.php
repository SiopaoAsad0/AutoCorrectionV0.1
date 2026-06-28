<?php

namespace App\Services\Spell;

/**
 * Jaro-Winkler Distance Algorithm
 * 
 * Used as a second algorithm alongside Adapted Levenshtein for:
 * - Chapter 4 comparative analysis
 * - Improving suggestion accuracy for short/similar words
 * - Handling transpositions and prefix similarities
 */
class JaroWinklerService
{
    private float $prefixScale;
    private int $maxPrefixLength;

    public function __construct()
    {
        // Standard Jaro-Winkler prefix scale (p ≤ 0.25 to keep similarity ≤ 1)
        $this->prefixScale = 0.1;
        $this->maxPrefixLength = 4;
    }

    /**
     * Compute Jaro similarity between two strings.
     * Returns 0.0 (no similarity) to 1.0 (identical).
     */
    public function jaro(string $a, string $b): float
    {
        if ($a === $b) return 1.0;

        $lenA = mb_strlen($a);
        $lenB = mb_strlen($b);

        if ($lenA === 0 || $lenB === 0) return 0.0;

        // Match window
        $matchWindow = (int) max($lenA, $lenB) / 2 - 1;
        $matchWindow = max(0, $matchWindow);

        $aChars = mb_str_split($a);
        $bChars = mb_str_split($b);

        $aMatched = array_fill(0, $lenA, false);
        $bMatched = array_fill(0, $lenB, false);

        $matches = 0;
        $transpositions = 0;

        // Find matches
        for ($i = 0; $i < $lenA; $i++) {
            $start = max(0, $i - $matchWindow);
            $end   = min($i + $matchWindow + 1, $lenB);

            for ($j = $start; $j < $end; $j++) {
                if ($bMatched[$j] || $aChars[$i] !== $bChars[$j]) continue;
                $aMatched[$i] = true;
                $bMatched[$j] = true;
                $matches++;
                break;
            }
        }

        if ($matches === 0) return 0.0;

        // Count transpositions
        $k = 0;
        for ($i = 0; $i < $lenA; $i++) {
            if (!$aMatched[$i]) continue;
            while (!$bMatched[$k]) $k++;
            if ($aChars[$i] !== $bChars[$k]) $transpositions++;
            $k++;
        }

        $jaro = (
            ($matches / $lenA) +
            ($matches / $lenB) +
            (($matches - $transpositions / 2) / $matches)
        ) / 3.0;

        return round($jaro, 6);
    }

    /**
     * Compute Jaro-Winkler similarity (adds prefix bonus to Jaro).
     * Returns 0.0 to 1.0.
     */
    public function similarity(string $a, string $b): float
    {
        $a = mb_strtolower($a);
        $b = mb_strtolower($b);

        $jaro = $this->jaro($a, $b);

        // Common prefix length (up to maxPrefixLength)
        $prefixLen = 0;
        $limit = min([$this->maxPrefixLength, mb_strlen($a), mb_strlen($b)]);
        $aChars = mb_str_split($a);
        $bChars = mb_str_split($b);

        for ($i = 0; $i < $limit; $i++) {
            if ($aChars[$i] !== $bChars[$i]) break;
            $prefixLen++;
        }

        $jaroWinkler = $jaro + ($prefixLen * $this->prefixScale * (1.0 - $jaro));

        return round(min(1.0, $jaroWinkler), 6);
    }

    /**
     * Jaro-Winkler distance (1 - similarity).
     * Returns 0.0 (identical) to 1.0 (completely different).
     */
    public function distance(string $a, string $b): float
    {
        return round(1.0 - $this->similarity($a, $b), 6);
    }

    /**
     * Score candidates using Jaro-Winkler similarity.
     * Returns candidates sorted by similarity descending.
     *
     * @param  array<int, array{word: string, pos: ?string, frequency: int}>  $candidates
     * @return array<int, array{word: string, pos: ?string, frequency: int, jw_similarity: float, jw_distance: float}>
     */
    public function scoreCandidates(string $source, array $candidates, float $minSimilarity = 0.75): array
    {
        $source = mb_strtolower($source);
        $scored = [];

        foreach ($candidates as $candidate) {
            $word = mb_strtolower($candidate['word'] ?? '');
            if ($word === '') continue;

            $similarity = $this->similarity($source, $word);
            if ($similarity < $minSimilarity) continue;

            $scored[] = array_merge($candidate, [
                'jw_similarity' => $similarity,
                'jw_distance'   => round(1.0 - $similarity, 6),
            ]);
        }

        usort($scored, fn($a, $b) => $b['jw_similarity'] <=> $a['jw_similarity']);

        return $scored;
    }

    /**
     * Compare Levenshtein and Jaro-Winkler scores for a word pair.
     * Used for Chapter 4 algorithm comparison reports.
     *
     * @return array{
     *   source: string,
     *   target: string,
     *   levenshtein_distance: float,
     *   jaro_winkler_similarity: float,
     *   jaro_winkler_distance: float,
     *   jaro_similarity: float,
     *   agreement: bool,
     *   preferred_algorithm: string
     * }
     */
    public function compareWithLevenshtein(
        string $source,
        string $target,
        float $levenshteinDistance,
        float $maxLevenshteinDistance = 3.0
    ): array {
        $jwSimilarity = $this->similarity($source, $target);
        $jwDistance   = 1.0 - $jwSimilarity;
        $jaroSim      = $this->jaro($source, $target);

        // Normalize Levenshtein to 0–1 range for comparison
        $maxLen = max(1, max(mb_strlen($source), mb_strlen($target)));
        $levNormalized = min(1.0, $levenshteinDistance / $maxLen);

        // Agreement: both algorithms agree the candidate is close
        $levAccepts = $levenshteinDistance <= $maxLevenshteinDistance;
        $jwAccepts  = $jwSimilarity >= 0.75;
        $agreement  = $levAccepts === $jwAccepts;

        // Prefer Jaro-Winkler for short words (≤5 chars) or high transposition cases
        // Prefer Levenshtein for longer words where edit count is more meaningful
        $sourceLen = mb_strlen($source);
        $preferredAlgorithm = $sourceLen <= 5 ? 'jaro-winkler' : 'levenshtein';

        return [
            'source'                  => $source,
            'target'                  => $target,
            'levenshtein_distance'    => round($levenshteinDistance, 4),
            'levenshtein_normalized'  => round($levNormalized, 4),
            'jaro_similarity'         => round($jaroSim, 4),
            'jaro_winkler_similarity' => round($jwSimilarity, 4),
            'jaro_winkler_distance'   => round($jwDistance, 4),
            'agreement'               => $agreement,
            'lev_accepts'             => $levAccepts,
            'jw_accepts'              => $jwAccepts,
            'preferred_algorithm'     => $preferredAlgorithm,
        ];
    }
}
