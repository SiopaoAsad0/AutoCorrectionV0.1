<?php

namespace App\Services\Spell;

class ContextAwarenessService
{
    /**
     * Score candidate contextual fitness in sentence window.
     *
     * @param  array<int, array{normalized: string}>  $tokens
     */
    public function scoreCandidate(array $tokens, int $index, string $candidateWord, string $candidatePos): float
    {
        $prev = $index > 0 ? $tokens[$index - 1]['normalized'] : null;
        $next = $index < count($tokens) - 1 ? $tokens[$index + 1]['normalized'] : null;
        $prev2 = $index > 1 ? $tokens[$index - 2]['normalized'] : null;
        $candidate = mb_strtolower($candidateWord);
        $pos = mb_strtolower($candidatePos);

        $score = 0.0;
        $penalty = 0.0;

        if ($prev !== null) {
            if ($this->isDeterminer($prev) && $this->isNominalLike($pos)) {
                $score += 0.45;
            }
            if ($this->isPronoun($prev) && ($this->isVerbLike($pos) || $this->isAdjectiveLike($pos))) {
                $score += 0.35;
            }
            if ($this->isAuxLike($prev) && $this->isVerbLike($pos)) {
                $score += 0.4;
            }
            if (($prev === 'mag' || $prev === 'nag') && $this->looksLikeHybridVerb($candidate)) {
                $score += 0.6;
            }
            if (($prev === 'mag' || $prev === 'nag') && $this->looksLikeCoPrefix($next)) {
                $score += 0.55;
            }
            if ($prev === 'to' && ! $this->isVerbLike($pos) && $pos !== 'unknown' && ! str_contains($pos, 'particle')) {
                $penalty += 0.4;
            }
            if (($prev === 'a' || $prev === 'an') && $this->isVerbLike($pos) && ! preg_match('/ing$/u', $candidate)) {
                $penalty += 0.25;
            }
        }

        if ($next !== null) {
            if ($this->isDeterminer($candidate) && $this->isNominalHint($next)) {
                $score += 0.3;
            }
            if ($this->isAdjectiveLike($pos) && $this->isNominalHint($next)) {
                $score += 0.25;
            }
            if ($this->isPreposition($candidate) && $this->isNominalHint($next)) {
                $score += 0.2;
            }
        }

        if ($prev2 !== null && $prev !== null && ($prev2 === 'mag' || $prev2 === 'nag') && ($prev === 'co' || str_starts_with($prev, 'co-'))) {
            $score += 0.5;
        }

        if ($this->looksLikeHybridVerb($candidate) && $this->isVerbLike($pos)) {
            $score += 0.25;
        }

        if ($this->looksLikeHybridVerb($candidate) || preg_match('/^(mag|nag)-co-/u', $candidate)) {
            $score += 0.2;
        }

        if ($candidate === 'co-compute' || $candidate === 'mag-co-compute') {
            $score += 0.35;
        }

        return round($score - $penalty, 3);
    }

    private function isDeterminer(string $word): bool
    {
        return in_array($word, ['the', 'a', 'an', 'this', 'that', 'these', 'those', 'ang', 'yung'], true);
    }

    private function isPronoun(string $word): bool
    {
        return in_array($word, ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'ako', 'ikaw', 'siya', 'kami', 'kayo', 'sila'], true);
    }

    private function isAuxLike(string $word): bool
    {
        return in_array($word, ['is', 'are', 'was', 'were', 'will', 'can', 'could', 'should', 'would', 'to', 'na', 'pa'], true);
    }

    private function isPreposition(string $word): bool
    {
        return in_array($word, ['in', 'on', 'at', 'to', 'for', 'from', 'with', 'sa', 'ng', 'para'], true);
    }

    private function isNominalHint(string $word): bool
    {
        return preg_match('/^[\p{L}][\p{L}\'-]{1,}$/u', $word) === 1;
    }

    private function isVerbLike(string $pos): bool
    {
        return str_contains($pos, 'verb');
    }

    private function isAdjectiveLike(string $pos): bool
    {
        return str_contains($pos, 'adjective');
    }

    private function isNominalLike(string $pos): bool
    {
        return str_contains($pos, 'noun') || str_contains($pos, 'adjective') || str_contains($pos, 'pronoun');
    }

    private function looksLikeHybridVerb(string $word): bool
    {
        return preg_match('/^(mag|nag|na)-?[a-z]+(?:-[a-z]+)?$/u', $word) === 1
            || preg_match('/^co-[a-z][a-z-]*$/u', $word) === 1
            || preg_match('/^[a-z]+-(compute|code|chat|post|share|stream|submit|print|edit|save|upload|download)$/u', $word) === 1;
    }

    private function looksLikeCoPrefix(?string $next): bool
    {
        if ($next === null) {
            return false;
        }

        return $next === 'co' || str_starts_with($next, 'co-');
    }
}
