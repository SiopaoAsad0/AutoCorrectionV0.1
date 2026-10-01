<?php

namespace App\Services\Spell;

/**
 * Hyphen rule for Filipino prefix + English root (Taglish verbs).
 *
 *  1. English root starts with a vowel (a, e, i, o, u)  -> hyphen   Nag-apply, Nag-open, Mag-email
 *  2. English root starts with a consonant              -> no hyphen  Nagwash, Nagwish
 *  3. Prefix "i" (I-)                                    -> always hyphen  I-stop, I-remind
 *
 * Rule 3 is checked first, so "i" keeps its hyphen even before a consonant.
 */
class HyphenRule
{
    /** Prefixes this rule applies to (verb-forming prefixes). */
    private const PREFIXES = ['mag', 'nag', 'pag', 'maka', 'maki', 'i'];

    public static function appliesTo(?string $prefix): bool
    {
        return $prefix !== null && in_array($prefix, self::PREFIXES, true);
    }

    public static function needsHyphen(string $prefix, string $root): bool
    {
        if ($prefix === 'i') {
            return true;
        }

        return preg_match('/^[aeiou]/u', mb_strtolower($root)) === 1;
    }

    /** Prefix + root with the hyphen placed (or left out) according to the rule. */
    public static function join(string $prefix, string $root): string
    {
        if (! self::appliesTo($prefix)) {
            return $prefix.$root;
        }

        return $prefix.(self::needsHyphen($prefix, $root) ? '-' : '').$root;
    }

    /**
     * Extra edit cost when the rebuilt word adds or removes the hyphen
     * compared with what the user typed (Nagapply -> Nag-apply).
     */
    public static function editCost(string $source, string $rebuilt): float
    {
        return (str_contains($source, '-') !== str_contains($rebuilt, '-')) ? 0.5 : 0.0;
    }
}
