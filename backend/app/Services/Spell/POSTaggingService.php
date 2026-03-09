<?php

namespace App\Services\Spell;

class POSTaggingService
{
    /**
     * Rule-based POS tag. Prefer dictionary POS if provided.
     */
    public function tag(string $word, ?string $dictionaryPos = null): string
    {
        if ($dictionaryPos !== null && $dictionaryPos !== '') {
            return $dictionaryPos;
        }
        return $this->tagByRules($word);
    }

    private function tagByRules(string $word): string
    {
        $w = mb_strtolower(trim($word));
        if ($w === '') {
            return 'Unknown';
        }

        if (preg_match('/^(dr|atty|engr|arch|prof|hon|mr|ms|mrs)\.?$/u', $w)) {
            return 'Noun';
        }

        if (preg_match('/^(mag|nag|mang|nang|maki|naki|ma|na|ipa|ipag|ika|pag)/u', $w)
            || preg_match('/^[b-df-hj-np-rt-v]um[aeiou]/u', $w)
            || preg_match('/(in|an|han|nan|hin)$/u', $w)) {
            return 'Verb';
        }
        if (preg_match('/^ma[a-z]{3,}/u', $w) || preg_match('/^(naka|napaka|pala|kay)/u', $w)) {
            return 'Adjective';
        }
        if (preg_match('/^(pag|pang|tag|taga|ka)/u', $w)) {
            return 'Noun';
        }

        if (mb_substr($w, -2) === 'ly') {
            return 'Adverb';
        }
        if (preg_match('/(ing|ed|ate|ify|ize|ise)$/u', $w)) {
            return 'Verb';
        }
        if (preg_match('/(able|ible|al|ful|ic|ish|less|ous|ive|y)$/u', $w)) {
            return 'Adjective';
        }
        if (preg_match('/(tion|sion|ness|ment|ity|ship|ance|ence|er|or|ist|ism)$/u', $w)) {
            return 'Noun';
        }

        return 'Unknown';
    }
}
