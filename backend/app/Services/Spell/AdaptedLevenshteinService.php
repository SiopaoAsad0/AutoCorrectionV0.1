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
        $this->insertCost = (float) ($costs['insert'] ?? 1.0);
        $this->deleteCost = (float) ($costs['delete'] ?? 1.0);
        $this->defaultSubstituteCost = (float) ($costs['substitute'] ?? 1.0);
        $this->substitutionWeights = TypoPattern::getSubstitutionWeights();
    }

    /**
     * Minimum weighted edit distance (two-row DP, O(nm) time, O(n) space).
     */
    public function distance(string $a, string $b): float
    {
        $lenA = mb_strlen($a);
        $lenB = mb_strlen($b);

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
            $charA = mb_substr($a, $i - 1, 1);
            for ($j = 1; $j <= $lenB; $j++) {
                $charB = mb_substr($b, $j - 1, 1);
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
        $lenA = mb_strlen($a);
        $lenB = mb_strlen($b);

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
            $charA = mb_substr($a, $i - 1, 1);
            for ($j = 1; $j <= $lenB; $j++) {
                $charB = mb_substr($b, $j - 1, 1);
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

            $charA = mb_substr($a, $i - 1, 1);
            $charB = mb_substr($b, $j - 1, 1);
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
