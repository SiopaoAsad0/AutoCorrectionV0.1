<?php

namespace App\Services\Spell;

use App\Models\Dictionary;

class DictionaryService
{
    public function __construct(
        private array $languages = ['english', 'tagalog', 'taglish']
    ) {
        $this->languages = config('spelling.languages', $this->languages);
    }

    /**
     * Find a single dictionary entry by normalized word.
     */
    public function find(string $normalizedWord): ?Dictionary
    {
        return Dictionary::where('word', $normalizedWord)
            ->whereIn('language', $this->languages)
            ->orderByDesc('frequency')
            ->first();
    }

    /**
     * Get candidate words for suggestions (length within tolerance).
     *
     * Candidates are ordered by length-proximity to the source word first,
     * since that is the strongest cheap predictor of low edit distance —
     * frequency is only used as a secondary tiebreaker among candidates of
     * equal length-proximity. This avoids excluding rare-but-close words
     * in favor of common-but-distant ones before SpellCorrectionService
     * ever gets a chance to compute real Levenshtein distance on them.
     *
     * @return array<int, array{word: string, language: string, pos: ?string, frequency: int}>
     */
    public function getCandidates(string $normalizedWord, int $lengthTolerance, int $maxCandidates): array
    {
        $len = mb_strlen($normalizedWord);
        $tolerance = config('spelling.length_tolerance', $lengthTolerance);

        // Pull a much wider pool than before. The old `* 5` multiplier
        // (with frequency-first ordering) meant close-but-rare words could
        // be excluded here before distance scoring ever ran upstream.
        $limit = max($maxCandidates * 20, 200);

        $rows = Dictionary::whereIn('language', $this->languages)
            ->lengthWithin($len, $tolerance)
            ->orderByRaw('ABS(LENGTH(word) - ?) ASC', [$len])
            ->orderByDesc('frequency')
            ->limit($limit)
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'word' => $row->word,
                'language' => $row->language,
                'pos' => $row->pos,
                'frequency' => (int) $row->frequency,
            ];
        }

        return $out;
    }

    /**
     * Frequent words fallback for broad next-word prediction.
     *
     * @return array<int, array{word: string, language: string, pos: ?string, frequency: int}>
     */
    public function getTopFrequent(array $languages, int $limit = 20): array
    {
        $rows = Dictionary::query()
            ->whereIn('language', $languages)
            ->where('frequency', '>', 0)
            ->orderByDesc('frequency')
            ->limit($limit)
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[] = [
                'word' => $row->word,
                'language' => $row->language,
                'pos' => $row->pos,
                'frequency' => (int) $row->frequency,
            ];
        }

        return $out;
    }
}
