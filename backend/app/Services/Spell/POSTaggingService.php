<?php

namespace App\Services\Spell;

class POSTaggingService
{
    /** Common Tagalog/Taglish particles and conjunctions (short words often unknown to rules) */
    private const TAGALOG_PARTICLE = ['po', 'ng', 'na', 'pa', 'ba', 'din', 'rin', 'lang', 'naman', 'kasi', 'daw', 'raw', 'ho', 'no', 'e', 'o', 'kaya', 'eh', 'ah'];

    private const TAGALOG_PRONOUN = ['ako', 'ko', 'mo', 'niya', 'natin', 'namin', 'sila', 'silang', 'atin', 'amin', 'ito', 'iyan', 'iyon', 'kita', 'kayo'];

    private const TAGALOG_PREPOSITION = ['sa', 'ng', 'ni', 'kay', 'para', 'tungkol', 'hango', 'mula', 'hanggang', 'laban', 'ayon', 'walang'];

    private const TAGALOG_CONJUNCTION = ['at', 'pero', 'o', 'kung', 'kapag', 'dahil', 'kaya', 'para', 'saka', 'pati', 'ni', 'bago', 'pagkatapos'];

    private const TAGALOG_ADVERB = ['kanina', 'talaga', 'na', 'opo', 'paano', 'bakit', 'saan', 'kailan', 'gaano', 'dito', 'doon', 'rito', 'roon', 'siguro', 'baka', 'marahil', 'medyo', 'sobra', 'sobrang', 'lalo', 'napaka', 'din', 'rin', 'lang', 'naman', 'na', 'pa', 'kamusta', 'kumusta'];

    private const TAGALOG_INTERJECTION = ['salamat', 'sige', 'ay', 'o', 'uy', 'oi', 'ara', 'aray', 'nakoo', 'grabe', 'sus', 'naku'];

    private const ENGLISH_DETERMINER = ['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'some', 'any', 'no', 'every', 'each', 'all', 'both', 'few', 'many', 'much', 'other', 'another'];

    private const ENGLISH_PRONOUN = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'what', 'who', 'which', 'whom', 'whose', 'this', 'that', 'these', 'those'];

    private const ENGLISH_PREPOSITION = ['in', 'on', 'at', 'to', 'for', 'from', 'of', 'with', 'by', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'over'];

    private const ENGLISH_CONJUNCTION = ['and', 'but', 'or', 'so', 'because', 'if', 'when', 'than', 'that', 'while', 'although', 'as'];

    private const ENGLISH_ADVERB = ['very', 'really', 'just', 'only', 'even', 'still', 'already', 'always', 'never', 'often', 'sometimes', 'here', 'there', 'where', 'when', 'why', 'how', 'now', 'then', 'today', 'later', 'soon', 'also', 'too', 'super', 'well', 'quickly', 'slowly'];

    /** Emerging internet / Gen Alpha-Beta slang frequently used in mixed-language writing. */
    private const HYBRID_SLANG = [
        'rizz', 'delulu', 'aura', 'gyat', 'sus', 'slay', 'bussin', 'drip',
        'npc', 'sigma', 'cap', 'nocap', 'brainrot', 'lowkey', 'highkey',
        'based', 'cooked', 'skibidi', 'bet', 'fr', 'frfr', 'mid', 'simp',
        'cringe', 'goated', 'mewing', 'ratio', 'valid', 'unhinged',
        'rentfree', 'maincharacter', 'irl', 'oomf', 'fyp',
    ];

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

        if ($this->inList($w, self::TAGALOG_PARTICLE)) {
            return 'Particle';
        }
        if ($this->inList($w, self::TAGALOG_PRONOUN)) {
            return 'Pronoun';
        }
        if ($this->inList($w, self::TAGALOG_PREPOSITION)) {
            return 'Preposition';
        }
        if ($this->inList($w, self::TAGALOG_CONJUNCTION)) {
            return 'Conjunction';
        }
        if ($this->inList($w, self::TAGALOG_ADVERB)) {
            return 'Adverb';
        }
        if ($this->inList($w, self::TAGALOG_INTERJECTION)) {
            return 'Interjection';
        }
        if ($this->inList($w, self::ENGLISH_DETERMINER)) {
            return 'Determiner';
        }
        if ($this->inList($w, self::ENGLISH_PRONOUN)) {
            return 'Pronoun';
        }
        if ($this->inList($w, self::ENGLISH_PREPOSITION)) {
            return 'Preposition';
        }
        if ($this->inList($w, self::ENGLISH_CONJUNCTION)) {
            return 'Conjunction';
        }
        if ($this->inList($w, self::ENGLISH_ADVERB)) {
            return 'Adverb';
        }
        if ($this->inList($w, self::HYBRID_SLANG)) {
            return 'Noun';
        }

        if (preg_match('/^(dr|atty|engr|arch|prof|hon|mr|ms|mrs)\.?$/u', $w)) {
            return 'Noun';
        }

        if (preg_match('/^(mag|nag|mang|nang|maki|naki|ma|na|ipa|ipag|ika|pag)([a-z]+)/u', $w)
            || preg_match('/^[b-df-hj-np-rt-v]um[aeiou]/u', $w)
            || preg_match('/(um|in|an|han|nan|hin)([a-z]+)$/u', $w)
            || preg_match('/^[a-z]+-(stress|late|attach|compute|code|chat|post|stream|share)/u', $w)
            || preg_match('/^(mag|nag)-[a-z]+(?:-[a-z]+)?$/u', $w)
            || preg_match('/^co-[a-z]+(?:-[a-z]+)?$/u', $w)) {
            return 'Verb';
        }
        if (preg_match('/^ma[a-z]{3,}/u', $w) || preg_match('/^(naka|napaka|pala|kay)([a-z]+)/u', $w)
            || preg_match('/(mabilis|maganda|pangit|malaki|maliit|masaya|malungkot|mataba|payat)$/u', $w)) {
            return 'Adjective';
        }
        if (preg_match('/^(pag|pang|tag|taga|ka)([a-z]+)/u', $w)) {
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

    private function inList(string $word, array $list): bool
    {
        return in_array($word, $list, true);
    }
}
