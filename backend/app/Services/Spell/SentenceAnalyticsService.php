<?php

namespace App\Services\Spell;

class SentenceAnalyticsService
{
    /**
     * Compute sentence-level analytics from word results.
     *
     * @param array<int, array{status: string, pos: string, distance?: float, language?: string}> $wordResults
     */
    public function compute(array $wordResults, string $detectedLanguage): array
    {
        $total = count($wordResults);
        $posCounts = [];
        $statusCounts = ['correct' => 0, 'misspelled' => 0, 'suggested' => 0];
        $distances = [];

        foreach ($wordResults as $w) {
            $pos = $w['pos'] ?? 'Unknown';
            $posCounts[$pos] = ($posCounts[$pos] ?? 0) + 1;

            $status = $this->normalizeStatus($w['status'] ?? '');
            if (isset($statusCounts[$status])) {
                $statusCounts[$status]++;
            }

            if (isset($w['distance']) && $w['distance'] !== null) {
                $distances[] = $w['distance'];
            }
        }

        $correctCount = $statusCounts['correct'] ?? 0;
        $misspelledCount = $statusCounts['misspelled'] ?? 0;
        $suggestedCount = $statusCounts['suggested'] ?? 0;
        $correctionRate = $total > 0 ? round($correctCount / $total, 4) : 0;
        $incorrectCount = $misspelledCount + $suggestedCount;
        $wordErrorRate = $total > 0 ? round($incorrectCount / $total, 4) : 0;

        return [
            'total_words' => $total,
            'pos_counts' => $posCounts,
            'correction_rate' => $correctionRate,
            'word_error_rate' => $wordErrorRate,
            'language' => $detectedLanguage,
            'status_counts' => $statusCounts,
            'distances' => $distances,
        ];
    }

    private function normalizeStatus(string $status): string
    {
        $s = strtolower($status);
        if ($s === 'correct') {
            return 'correct';
        }
        if (in_array($s, ['incorrect', 'misspelled'], true)) {
            return 'misspelled';
        }
        if ($s === 'suggested' || str_contains($s, 'suggest')) {
            return 'suggested';
        }
        return 'misspelled';
    }
}
