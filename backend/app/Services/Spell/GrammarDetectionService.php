<?php

namespace App\Services\Spell;

/**
 * Lightweight rule-based grammar hints (English + a few Taglish patterns).
 * Not a full parser — extensible toward richer NLP later.
 *
 * @param  array<int, array{raw: string, normalized: string}>  $tokens
 * @return array<int, array{start_word_index: int, end_word_index: int, message: string, replacement: string, rule: string}>
 */
class GrammarDetectionService
{
    public function analyze(array $tokens): array
    {
        $n = count($tokens);
        if ($n === 0) {
            return [];
        }

        $norm = array_map(fn ($t) => mb_strtolower($t['normalized']), $tokens);
        $issues = [];
        $covered = [];

        $add = function (int $start, int $end, string $message, string $replacement, string $rule) use (&$issues, &$covered): void {
            for ($k = $start; $k <= $end; $k++) {
                if (isset($covered[$k])) {
                    return;
                }
            }
            for ($k = $start; $k <= $end; $k++) {
                $covered[$k] = true;
            }
            $issues[] = [
                'start_word_index' => $start,
                'end_word_index' => $end,
                'message' => $message,
                'replacement' => $replacement,
                'rule' => $rule,
            ];
        };

        $thirdSing = ['she', 'he', 'it'];

        for ($i = 0; $i < $n - 1; $i++) {
            if (in_array($norm[$i], $thirdSing, true) && ($norm[$i + 1] === 'dont' || $norm[$i + 1] === "don't")) {
                $add($i + 1, $i + 1, 'Use "doesn\'t" (not "don\'t") with she / he / it.', "doesn't", 'aux_agreement');
            }
        }

        for ($i = 0; $i < $n - 1; $i++) {
            if (($norm[$i] === 'dont' || $norm[$i] === "don't" || $norm[$i] === 'doesnt' || $norm[$i] === "doesn't") && $i + 1 < $n) {
                $v = $norm[$i + 1];
                $fixed = match ($v) {
                    'likes' => 'like',
                    'goes' => 'go',
                    'eats' => 'eat',
                    'has' => 'have',
                    'does' => 'do',
                    default => null,
                };
                if ($fixed !== null) {
                    $add($i + 1, $i + 1, 'After don\'t / doesn\'t, use the base form of the verb.', $fixed, 'bare_infinitive');
                }
            }
        }

        for ($i = 0; $i < $n - 1; $i++) {
            if (in_array($norm[$i], ['you', 'we', 'they'], true) && $norm[$i + 1] === 'was') {
                $add($i + 1, $i + 1, 'Use "were" (not "was") with you / we / they.', 'were', 'be_agreement');
            }
            if ($norm[$i] === 'i' && $norm[$i + 1] === 'are') {
                $add($i + 1, $i + 1, 'Use "am" (not "are") with I.', 'am', 'be_agreement');
            }
        }

        if (in_array('yesterday', $norm, true)) {
            for ($i = 0; $i < $n; $i++) {
                if ($norm[$i] !== 'go') {
                    continue;
                }
                for ($b = max(0, $i - 6); $b < $i; $b++) {
                    if (in_array($norm[$b], $thirdSing, true)) {
                        $add($i, $i, 'Past time ("yesterday") — use past tense with she / he / it.', 'went', 'tense');
                        break;
                    }
                }
            }
        }

        return $issues;
    }
}
