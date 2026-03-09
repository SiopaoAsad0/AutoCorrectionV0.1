<?php

namespace App\Services\Spell;

use App\Models\TypoPattern;

class WeightedLevenshteinService
{
    private array $substitutionWeights = [];
    private float $defaultSubstitute = 1.0;
    private float $defaultInsert = 1.0;
    private float $defaultDelete = 1.0;

    public function __construct()
    {
        $this->substitutionWeights = TypoPattern::getSubstitutionWeights();
    }

    /**
     * Compute weighted Levenshtein distance between two strings.
     */
    public function distance(string $a, string $b): float
    {
        $lenA = mb_strlen($a);
        $lenB = mb_strlen($b);

        if ($lenA === 0) {
            return $lenB * $this->defaultInsert;
        }
        if ($lenB === 0) {
            return $lenA * $this->defaultDelete;
        }

        $prev = range(0, $lenB);
        for ($j = 1; $j <= $lenB; $j++) {
            $prev[$j] = $j * $this->defaultInsert;
        }

        for ($i = 1; $i <= $lenA; $i++) {
            $curr = [$i * $this->defaultDelete];
            $charA = mb_substr($a, $i - 1, 1);
            for ($j = 1; $j <= $lenB; $j++) {
                $charB = mb_substr($b, $j - 1, 1);
                $subCost = $charA === $charB ? 0 : $this->substitutionCost($charA, $charB);
                $curr[$j] = min(
                    $prev[$j] + $this->defaultDelete,
                    $curr[$j - 1] + $this->defaultInsert,
                    $prev[$j - 1] + $subCost
                );
            }
            $prev = $curr;
        }

        return (float) $prev[$lenB];
    }

    private function substitutionCost(string $from, string $to): float
    {
        $key = $from . '_' . $to;
        return $this->substitutionWeights[$key] ?? $this->defaultSubstitute;
    }
}
