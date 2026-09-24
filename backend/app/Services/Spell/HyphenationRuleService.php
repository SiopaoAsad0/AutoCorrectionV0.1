<?php

namespace App\Services\Spell;

use App\Models\Dictionary;

/**
 * Filipino-prefix + English-root hyphenation rule.
 *
 * Rule: Filipino prefix + English root word
 *  - root starts with a vowel (a e i o u)  -> hyphen between prefix and root
 *      nagapply -> nag-apply, nagopen -> nag-open, magemail -> mag-email,
 *      istop -> i-stop, iremind -> i-remind
 *  - root starts with a consonant          -> no hyphen, prefix fuses to root
 *      nagwash stays nagwash, nagwish stays nagwish
 *
 * The root is only accepted as "English" if it's found in the dictionary
 * tagged language = english, which keeps this from misfiring on ordinary
 * Tagalog words that happen to start with the same letters as one of these
 * prefixes (e.g. "nagbigay" is left alone because "bigay" isn't an English
 * dictionary entry).
 */
class HyphenationRuleService
{
    /**
     * Filipino prefixes this rule applies to. Kept narrower than the full
     * spelling.morphology_prefixes list (which also includes short,
     * generic affixes like "ka"/"ma" that are far more likely to collide
     * with the start of an unrelated English word and produce a false
     * correction).
     *
     * Sorted longest-first in the constructor so a longer prefix (e.g.
     * "naka") is preferred over a shorter one that could also match
     * (e.g. "na") when both would technically fit.
     *
     * @var array<int, string>
     */
    private array $prefixes;

    /** Minimum root length required before treating it as a real English
     *  root rather than a coincidental short match (e.g. "on", "it"). */
    private const MIN_ROOT_LENGTH = 3;

    public function __construct()
    {
        $this->prefixes = config('spelling.hyphenation_prefixes', [
            'naka', 'maka', 'maki', 'naki', 'mang', 'nang', 'ipag', 'ipa',
            'nag', 'mag', 'ika', 'i', 'um',
        ]);
        usort($this->prefixes, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));
    }

    /**
     * Apply the rule to a single word (as typed, original casing kept).
     * Returns the corrected form, or null if no correction applies.
     */
    public function correct(string $word): ?string
    {
        $word = trim($word);
        if ($word === '') {
            return null;
        }

        $lower = mb_strtolower($word);

        foreach ($this->prefixes as $prefix) {
            $prefixLen = mb_strlen($prefix);
            if (mb_substr($lower, 0, $prefixLen) !== $prefix) {
                continue;
            }

            $rest = mb_substr($lower, $prefixLen);
            $hasHyphen = mb_substr($rest, 0, 1) === '-';
            $root = $hasHyphen ? mb_substr($rest, 1) : $rest;

            if (! $this->isEnglishRoot($root)) {
                continue;
            }

            $corrected = $this->build($prefix, $root);
            if ($corrected === $lower) {
                return null; // already correctly formed
            }

            return $this->matchCase($word, $corrected);
        }

        return null;
    }

    /**
     * Same output shape as GrammarDetectionService::analyze(), so results
     * can be merged into the same issues array.
     *
     * @param  array<int, array{raw: string, normalized: string}>  $tokens
     * @return array<int, array{start_word_index: int, end_word_index: int, message: string, replacement: string, rule: string}>
     */
    public function analyze(array $tokens): array
    {
        $issues = [];

        foreach ($tokens as $i => $token) {
            $normalized = $token['normalized'] ?? '';
            if ($normalized === '') {
                continue;
            }

            $fixed = $this->correct($normalized);
            if ($fixed === null) {
                continue;
            }

            $addsHyphen = str_contains($fixed, '-') && ! str_contains(mb_strtolower($normalized), '-');

            $issues[] = [
                'start_word_index' => $i,
                'end_word_index' => $i,
                'message' => $addsHyphen
                    ? 'Hyphenate the Filipino prefix before an English root that starts with a vowel.'
                    : 'Filipino prefix + English root starting with a consonant does not take a hyphen.',
                'replacement' => $fixed,
                'rule' => 'filipino_prefix_hyphenation',
            ];
        }

        return $issues;
    }

    private function build(string $prefix, string $root): string
    {
        return $this->startsWithVowel($root) ? "{$prefix}-{$root}" : "{$prefix}{$root}";
    }

    private function startsWithVowel(string $word): bool
    {
        return preg_match('/^[aeiou]/iu', $word) === 1;
    }

    private function isEnglishRoot(string $root): bool
    {
        if (mb_strlen($root) < self::MIN_ROOT_LENGTH) {
            return false;
        }

        return Dictionary::query()
            ->where('word', $root)
            ->where('language', 'english')
            ->exists();
    }

    /** Preserve the original word's leading capitalization on the corrected form. */
    private function matchCase(string $original, string $corrected): string
    {
        if (preg_match('/^\p{Lu}/u', $original) === 1) {
            return mb_strtoupper(mb_substr($corrected, 0, 1)).mb_substr($corrected, 1);
        }

        return $corrected;
    }
}
