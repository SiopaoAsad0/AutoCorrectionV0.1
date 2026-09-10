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

        // Typos almost never change the first character. Now that the
        // dictionary holds 100k+ rows (bulk lexicons across three
        // languages), a plain length+frequency cutoff at $limit gets
        // dominated by unrelated same-length words, crowding out the
        // actual correction (e.g. "gutum" -> "gutom" never made the top
        // 200 same-length words once thousands of others tied or beat its
        // frequency). Narrowing to the same first letter first keeps the
        // pool relevant; the true match is preserved almost every time.
        $firstChar = mb_substr($normalizedWord, 0, 1);
        $firstCharIsSafe = $firstChar !== '' && preg_match('/^[\p{L}\p{N}]$/u', $firstChar) === 1;

        $query = Dictionary::whereIn('language', $this->languages)
            ->lengthWithin($len, $tolerance);

        if ($firstCharIsSafe) {
            $query->where('word', 'like', $firstChar.'%');
        }

        $rows = $query
            ->orderByRaw('ABS(LENGTH(word) - ?) ASC', [$len])
            ->orderByDesc('frequency')
            ->limit($limit)
            ->get();

        // Fallback for the rarer case where the first letter itself was
        // mistyped: only broaden the search if the narrow pool came up
        // short, so the common case doesn't reintroduce the crowding bug.
        if ($firstCharIsSafe && $rows->count() < min($maxCandidates * 4, $limit)) {
            $broader = Dictionary::whereIn('language', $this->languages)
                ->lengthWithin($len, $tolerance)
                ->where('word', 'not like', $firstChar.'%')
                ->orderByRaw('ABS(LENGTH(word) - ?) ASC', [$len])
                ->orderByDesc('frequency')
                ->limit($limit)
                ->get();
            $rows = $rows->concat($broader);
        }

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
