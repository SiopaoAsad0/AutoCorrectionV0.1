<?php

namespace App\Services\Spell;

use App\Models\TypoPattern;

/**
 * Taglish-oriented edit distance: configurable insert/delete/substitute costs
 * plus per-pair substitution weights from typo_patterns (phonetic-style penalties).
 */
class AdaptedLevenshteinService
{
    private array $substitutionWeights = [];

    private float $insertCost;

    private float $deleteCost;

    private float $defaultSubstituteCost;

    public function __construct()
    {
        $costs = config('spelling.edit_costs', []);
        // Forced to standard, uniform Levenshtein costs (insert/delete/substitute
        // all = 1.0) and an empty substitution-weight table. Per-pair weighted
        // costs from typo_patterns are intentionally NOT loaded here, so this
        // now computes plain/standard Levenshtein edit distance rather than an
        // adapted or phonetically-weighted variant.
        $this->insertCost = (float) ($costs['insert'] ?? 1.0);
        $this->deleteCost = (float) ($costs['delete'] ?? 1.0);
        $this->defaultSubstituteCost = (float) ($costs['substitute'] ?? 1.0);
        $this->substitutionWeights = [];
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

        if ($lenA === 0) {
            return $lenB * $this->insertCost;
        }
        if ($lenB === 0) {
            return $lenA * $this->deleteCost;
        }

        $prev = range(0, $lenB);
        for ($j = 1; $j <= $lenB; $j++) {
            $prev[$j] = $j * $this->insertCost;
        }

        for ($i = 1; $i <= $lenA; $i++) {
            $curr = [$i * $this->deleteCost];
            $charA = $charsA[$i - 1];
            for ($j = 1; $j <= $lenB; $j++) {
                $charB = $charsB[$j - 1];
                $subCost = $charA === $charB ? 0.0 : $this->substitutionCost($charA, $charB);
                $curr[$j] = min(
                    $prev[$j] + $this->deleteCost,
                    $curr[$j - 1] + $this->insertCost,
                    $prev[$j - 1] + $subCost
                );
            }
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
        for ($j = 0; $j <= $lenB; $j++) {
            $dp[0][$j] = $j * $this->insertCost;
        }
        for ($i = 1; $i <= $lenA; $i++) {
            $dp[$i][0] = $i * $this->deleteCost;
        }

        for ($i = 1; $i <= $lenA; $i++) {
            $charA = $charsA[$i - 1];
            for ($j = 1; $j <= $lenB; $j++) {
                $charB = $charsB[$j - 1];
                $subCost = $charA === $charB ? 0.0 : $this->substitutionCost($charA, $charB);
                $dp[$i][$j] = min(
                    $dp[$i - 1][$j] + $this->deleteCost,
                    $dp[$i][$j - 1] + $this->insertCost,
                    $dp[$i - 1][$j - 1] + $subCost
                );
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
            $costInsert = $dp[$i][$j - 1] + $this->insertCost;
            $costDiag = $dp[$i - 1][$j - 1] + $subCost;
            $here = $dp[$i][$j];

            // Tie-break: prefer diagonal (match/substitute), then delete, then insert — stable paths.
            if ($this->floatEq($here, $costDiag)) {
                if ($subCost > 0.0) {
                    $subs++;
                }
                $i--;
                $j--;
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
