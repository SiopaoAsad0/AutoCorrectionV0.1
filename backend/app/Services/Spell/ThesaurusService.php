<?php

namespace App\Services\Spell;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * WordNet-style suggestion enrichment using Datamuse API.
 * Uses parallel requests and cache for faster analysis.
 */
class ThesaurusService
{
    private const DATAMUSE_BASE = 'https://api.datamuse.com/words';

    /** Per Datamuse query; synonyms + near meanings widen “standard word” options (e.g. movie → film). */
    private const MAX_RESULTS = 12;

    private const TIMEOUT_SECONDS = 2;

    private const CACHE_TTL_SECONDS = 3600;

    /**
     * Get suggestion candidates. Cached per word; parallel API calls.
     * Returns list of [ 'word' => string, 'score' => int ] for English words.
     */
    public function getSuggestions(string $normalizedWord): array
    {
        if (mb_strlen($normalizedWord) < 2) {
            return [];
        }

        $word = $normalizedWord;
        $cacheKey = 'thesaurus:'.$word;

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($word) {
            $results = [];
            try {
                $responses = Http::pool(fn ($pool) => [
                    $pool->as('sp')->timeout(self::TIMEOUT_SECONDS)->get(self::DATAMUSE_BASE, ['sp' => $word, 'max' => self::MAX_RESULTS]),
                    $pool->as('sl')->timeout(self::TIMEOUT_SECONDS)->get(self::DATAMUSE_BASE, ['sl' => $word, 'max' => self::MAX_RESULTS]),
                    $pool->as('ml')->timeout(self::TIMEOUT_SECONDS)->get(self::DATAMUSE_BASE, ['ml' => $word, 'max' => self::MAX_RESULTS]),
                    $pool->as('syn')->timeout(self::TIMEOUT_SECONDS)->get(self::DATAMUSE_BASE, [
                        'rel_syn' => $word,
                        'max' => self::MAX_RESULTS,
                    ]),
                ]);

                foreach (['sp', 'sl', 'ml', 'syn'] as $key) {
                    $resp = $responses[$key] ?? null;
                    if ($resp && $resp->successful()) {
                        $data = $resp->json();
                        if (! is_array($data)) {
                            continue;
                        }
                        foreach ($data as $item) {
                            $w = $item['word'] ?? null;
                            if ($w === null || $w === $word) {
                                continue;
                            }
                            if (str_contains($w, ' ')) {
                                continue;
                            }
                            $score = (int) ($item['score'] ?? 0);
                            if ($key === 'syn') {
                                $score = max($score, 5000);
                            }
                            if (! isset($results[$w]) || $results[$w] < $score) {
                                $results[$w] = $score;
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::debug('ThesaurusService: '.$e->getMessage());
            }

            uasort($results, fn ($a, $b) => $b <=> $a);
            $out = [];
            foreach ($results as $w => $s) {
                $out[] = ['word' => $w, 'score' => $s];
            }

            return $out;
        });
    }
}
