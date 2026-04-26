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
     * @return array<int, array{word: string, language: string, pos: ?string, frequency: int}>
     */
    public function getCandidates(string $normalizedWord, int $lengthTolerance, int $maxCandidates): array
    {
        $len = mb_strlen($normalizedWord);
        $tolerance = config('spelling.length_tolerance', $lengthTolerance);
        $limit = $maxCandidates * 5;

        $rows = Dictionary::whereIn('language', $this->languages)
            ->lengthWithin($len, $tolerance)
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
