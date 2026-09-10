<?php

namespace Database\Seeders;

use App\Models\TypoPattern;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class TypoPatternSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('typo_patterns')) {
            return;
        }

        foreach ($this->patterns() as $pattern) {
            TypoPattern::firstOrCreate(
                [
                    'pattern_from' => $pattern['pattern_from'],
                    'pattern_to' => $pattern['pattern_to'],
                ],
                $pattern
            );
        }
    }

    /**
     * Single-character substitution weights consumed by
     * AdaptedLevenshteinService::substitutionCost(). Lower weight = cheaper
     * substitution = more likely to be this specific typo rather than an
     * unrelated one, relative to the 1.0 default. Pairs are added in both
     * directions since a typo can go either way.
     *
     * @return array<int, array{pattern_from: string, pattern_to: string, weight: float}>
     */
    private function patterns(): array
    {
        $pairs = [
            // ── Filipino phonetic confusions (historical /f/, /v/ gaps;
            //    vowel-quality overlap in casual spelling) ─────────────────
            ['f', 'p', 0.35],
            ['v', 'b', 0.35],
            ['e', 'i', 0.4],
            ['o', 'u', 0.4],
            ['c', 'k', 0.45],
            ['c', 's', 0.55],
            ['d', 'r', 0.5],
            ['z', 's', 0.5],
            ['j', 'h', 0.6],
            ['y', 'i', 0.55],
            ['w', 'u', 0.55],

            // ── QWERTY-adjacency typos (language-independent) ────────────
            ['a', 's', 0.6],
            ['s', 'd', 0.6],
            ['d', 'f', 0.6],
            ['g', 'h', 0.6],
            ['h', 'j', 0.6],
            ['j', 'k', 0.6],
            ['k', 'l', 0.6],
            ['q', 'w', 0.65],
            ['w', 'e', 0.65],
            ['e', 'r', 0.65],
            ['r', 't', 0.65],
            ['i', 'o', 0.6],
            ['o', 'p', 0.6],
            ['z', 'x', 0.65],
            ['x', 'c', 0.65],
            ['n', 'm', 0.6],
            ['m', 'n', 0.6],
        ];

        $rows = [];
        foreach ($pairs as [$from, $to, $weight]) {
            $rows[] = ['pattern_from' => $from, 'pattern_to' => $to, 'weight' => $weight];
            $rows[] = ['pattern_from' => $to, 'pattern_to' => $from, 'weight' => $weight];
        }

        return $rows;
    }
}
