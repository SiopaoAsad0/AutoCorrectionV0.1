<?php

namespace App\Services\Spell;

use App\Models\TypoPattern;
use Illuminate\Support\Facades\Cache;

/**
 * Taglish-oriented edit distance: configurable insert/delete/substitute costs
 * plus per-pair substitution weights from typo_patterns (phonetic-style penalties).
 */
class AdaptedLevenshteinService
{
    private array $substitutionWeights = [];

    private float $insertCost;

    private float $vowelInsertCost;

    private float $transposeCost;

    private float $deleteCost;

    private float $defaultSubstituteCost;

    public function __construct()
    {
        $costs = config('spelling.edit_costs', []);
        $this->insertCost = (float) ($costs['insert'] ?? 1.0);
        // Filipino texting often drops vowels (sya = siya, ganto = ganito,
        // salmat = salamat). Re-adding a missing vowel is therefore a cheaper
        // edit than other insertions. Defaults to the normal insert cost, so
        // nothing changes unless 'insert_vowel' is set in config.
        $this->vowelInsertCost = (float) ($costs['insert_vowel'] ?? $this->insertCost);
        $this->deleteCost = (float) ($costs['delete'] ?? 1.0);
        $this->defaultSubstituteCost = (float) ($costs['substitute'] ?? 1.0);
        // Swapping two neighbouring letters (emial -> email) is one slip of the fingers,
        // not two substitutions.
        $this->transposeCost = (float) ($costs['transpose'] ?? $this->defaultSubstituteCost);

        // Per-pair weighted substitution costs (phonetic-style penalties for
        // common Tagalog/Taglish typing confusions, e.g. f/p, v/b, e/i) are
        // loaded from typo_patterns so this behaves as an adapted, not plain,
        // Levenshtein distance. Cached since the service is constructed fresh
        // on every request.
        $this->substitutionWeights = Cache::remember(
            'typo_pattern_substitution_weights',
            3600,
            fn () => TypoPattern::getSubstitutionWeights()
        );
    }

    /**
     * Minimum weighted edit distance (two-row DP, O(nm) time, O(n) space).
     *
     * Splits both strings into char arrays once up front (mb_str_split)
     * instead of calling mb_substr() inside the nested loops. mb_substr()
     * re-scans a multi-byte string from its start on every call, so doing
     * it per-cell turned this into effectively O(n^2 * m) rather than
     * O(n * m) — with getCandidates() returning up to ~200 candidates per
     * word, that repeated re-scanning was the dominant cost behind the
     * reported per-request latency.
     */
    public function distance(string $a, string $b): float
    {
        $charsA = mb_str_split($a);
        $charsB = mb_str_split($b);
        $lenA = count($charsA);
        $lenB = count($charsB);
        $insB = array_map(fn ($c) => $this->insertCostFor($c), $charsB);

        if ($lenA === 0) {
            return (float) array_sum($insB);
        }
        if ($lenB === 0) {
            return $lenA * $this->deleteCost;
        }

        $prev2 = [];
        $prev = [0.0];
        for ($j = 1; $j <= $lenB; $j++) {
            $prev[$j] = $prev[$j - 1] + $insB[$j - 1];
        }

        for ($i = 1; $i <= $lenA; $i++) {
            $curr = [$i * $this->deleteCost];
            $charA = $charsA[$i - 1];
            for ($j = 1; $j <= $lenB; $j++) {
                $charB = $charsB[$j - 1];
                $subCost = $charA === $charB ? 0.0 : $this->substitutionCost($charA, $charB);
                $best = min(
                    $prev[$j] + $this->deleteCost,
                    $curr[$j - 1] + $insB[$j - 1],
                    $prev[$j - 1] + $subCost
                );
                if (
                    $i > 1 && $j > 1 && $charA !== $charB
                    && $charA === $charsB[$j - 2] && $charsA[$i - 2] === $charB
                ) {
                    $best = min($best, $prev2[$j - 2] + $this->transposeCost);
                }
                $curr[$j] = $best;
            }
            $prev2 = $prev;
            $prev = $curr;
        }

        return (float) $prev[$lenB];
    }

    /**
     * Operation counts along one minimum-cost alignment (full matrix + backtrack).
     *
     * @return array{substitutions: int, insertions: int, deletions: int}
     */
    public function editBreakdown(string $a, string $b): array
    {
        $charsA = mb_str_split($a);
        $charsB = mb_str_split($b);
        $lenA = count($charsA);
        $lenB = count($charsB);
        $insB = array_map(fn ($c) => $this->insertCostFor($c), $charsB);

        if ($lenA === 0 && $lenB === 0) {
            return ['substitutions' => 0, 'insertions' => 0, 'deletions' => 0];
        }
        if ($lenA === 0) {
            return ['substitutions' => 0, 'insertions' => $lenB, 'deletions' => 0];
        }
        if ($lenB === 0) {
            return ['substitutions' => 0, 'insertions' => 0, 'deletions' => $lenA];
        }

        $dp = [];
        $dp[0][0] = 0.0;
        for ($j = 1; $j <= $lenB; $j++) {
            $dp[0][$j] = $dp[0][$j - 1] + $insB[$j - 1];
        }
        for ($i = 1; $i <= $lenA; $i++) {
            $dp[$i][0] = $i * $this->deleteCost;
        }

        for ($i = 1; $i <= $lenA; $i++) {
            $charA = $charsA[$i - 1];
            for ($j = 1; $j <= $lenB; $j++) {
                $charB = $charsB[$j - 1];
                $subCost = $charA === $charB ? 0.0 : $this->substitutionCost($charA, $charB);
                $best = min(
                    $dp[$i - 1][$j] + $this->deleteCost,
                    $dp[$i][$j - 1] + $insB[$j - 1],
                    $dp[$i - 1][$j - 1] + $subCost
                );
                if (
                    $i > 1 && $j > 1 && $charA !== $charB
                    && $charA === $charsB[$j - 2] && $charsA[$i - 2] === $charB
                ) {
                    $best = min($best, $dp[$i - 2][$j - 2] + $this->transposeCost);
                }
                $dp[$i][$j] = $best;
            }
        }

        $subs = 0;
        $ins = 0;
        $del = 0;
        $i = $lenA;
        $j = $lenB;

        while ($i > 0 || $j > 0) {
            if ($i === 0) {
                $ins++;
                $j--;

                continue;
            }
            if ($j === 0) {
                $del++;
                $i--;

                continue;
            }

            $charA = $charsA[$i - 1];
            $charB = $charsB[$j - 1];
            $subCost = $charA === $charB ? 0.0 : $this->substitutionCost($charA, $charB);

            $costDelete = $dp[$i - 1][$j] + $this->deleteCost;
            $costInsert = $dp[$i][$j - 1] + $insB[$j - 1];
            $costDiag = $dp[$i - 1][$j - 1] + $subCost;
            $here = $dp[$i][$j];

            // Tie-break: prefer diagonal (match/substitute), then delete, then insert — stable paths.
            if ($this->floatEq($here, $costDiag)) {
                if ($subCost > 0.0) {
                    $subs++;
                }
                $i--;
                $j--;
            } elseif (
                $i > 1 && $j > 1 && $charA !== $charB
                && $charA === $charsB[$j - 2] && $charsA[$i - 2] === $charB
                && $this->floatEq($here, $dp[$i - 2][$j - 2] + $this->transposeCost)
            ) {
                // A swap of two neighbouring letters is reported as two substitutions
                // (the breakdown only has substitution / insertion / deletion counts).
                $subs += 2;
                $i -= 2;
                $j -= 2;
            } elseif ($this->floatEq($here, $costDelete)) {
                $del++;
                $i--;
            } else {
                $ins++;
                $j--;
            }
        }

        return [
            'substitutions' => $subs,
            'insertions' => $ins,
            'deletions' => $del,
        ];
    }

    private function insertCostFor(string $char): float
    {
        return in_array(mb_strtolower($char), ['a', 'e', 'i', 'o', 'u'], true)
            ? $this->vowelInsertCost
            : $this->insertCost;
    }

    private function substitutionCost(string $from, string $to): float
    {
        $key = $from . '_' . $to;

        return $this->substitutionWeights[$key] ?? $this->defaultSubstituteCost;
    }

    private function floatEq(float $a, float $b, float $eps = 1e-9): bool
    {
        return abs($a - $b) < $eps;
    }
}
