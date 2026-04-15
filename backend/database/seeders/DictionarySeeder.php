<?php

namespace Database\Seeders;

use App\Models\Dictionary;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DictionarySeeder extends Seeder
{
    private const CORPUS_ENGLISH_FREQUENCY = 6;

    private const CORPUS_TAGALOG_FREQUENCY = 5;

    /** High-frequency English list (google-10000-english, MIT). */
    private const BULK_ENGLISH_FREQUENCY = 7;

    /** Same lemmas as common English, tagged for Taglish code-mixing. */
    private const BULK_ENGLISH_AS_TAGLISH_FREQUENCY = 6;

    /** Tagalog lemmas mirrored as Taglish (same surface forms in mixed speech). */
    private const TAGALOG_AS_TAGLISH_FREQUENCY = 4;

    /** Taglish-only colloquial / code-switch list (frontend/public/taglish/taglish_common.txt). */
    private const TAGLISH_EXTRA_FREQUENCY = 5;

    private const INSERT_CHUNK = 600;

    public function run(): void
    {
        $words = array_merge(
            $this->englishWords(),
            $this->tagalogWords(),
            $this->taglishWords()
        );

        foreach ($words as $entry) {
            Dictionary::firstOrCreate(
                ['word' => $entry['word'], 'language' => $entry['language']],
                $entry
            );
        }

        // ~10k English + same as Taglish; typo corpora; ~42k Tagalog + mirror as Taglish
        $this->seedLineLexiconFromPublic(
            'english/google-10000-english.txt',
            'english',
            self::BULK_ENGLISH_FREQUENCY
        );
        $this->seedLineLexiconFromPublic(
            'english/google-10000-english.txt',
            'taglish',
            self::BULK_ENGLISH_AS_TAGLISH_FREQUENCY
        );

        $this->seedEnglishTypoCorpora();
        $this->seedLineLexiconFromPublic(
            'tagalog/tagalog_dict.txt',
            'tagalog',
            self::CORPUS_TAGALOG_FREQUENCY
        );
        $this->seedLineLexiconFromPublic(
            'tagalog/tagalog_dict.txt',
            'taglish',
            self::TAGALOG_AS_TAGLISH_FREQUENCY
        );

        $this->seedLineLexiconFromPublic(
            'taglish/taglish_common.txt',
            'taglish',
            self::TAGLISH_EXTRA_FREQUENCY
        );
    }

    /**
     * English typo corpora (correct word left of ":") — same format as aspell / Birkbeck / Wikipedia lists.
     */
    private function seedEnglishTypoCorpora(): void
    {
        $relativeFiles = [
            'english/aspell.txt',
            'english/birkbeck.txt',
            'english/wikipedia.txt',
            'english/spell-testset1.txt',
            'english/spell-testset2.txt',
        ];

        $base = $this->frontendPublicPath();
        if ($base === null) {
            return;
        }

        $now = now()->toDateTimeString();
        $batch = [];

        foreach ($relativeFiles as $rel) {
            $path = $base.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $rel);
            if (! is_readable($path)) {
                continue;
            }
            $fh = fopen($path, 'r');
            if ($fh === false) {
                continue;
            }
            while (($line = fgets($fh)) !== false) {
                $word = $this->correctWordFromTypoCorpusLine($line);
                if ($word === null) {
                    continue;
                }
                $batch[] = [
                    'word' => $word,
                    'language' => 'english',
                    'pos' => null,
                    'frequency' => self::CORPUS_ENGLISH_FREQUENCY,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
                if (count($batch) >= self::INSERT_CHUNK) {
                    DB::table('dictionaries')->insertOrIgnore($batch);
                    $batch = [];
                }
            }
            fclose($fh);
        }

        if ($batch !== []) {
            DB::table('dictionaries')->insertOrIgnore($batch);
        }
    }

    /**
     * One word per line under frontend/public (UTF-8). Skips blanks; insertOrIgnore on (word, language).
     */
    private function seedLineLexiconFromPublic(string $relativePath, string $language, int $frequency): void
    {
        $base = $this->frontendPublicPath();
        if ($base === null) {
            return;
        }

        $path = $base.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
        if (! is_readable($path)) {
            return;
        }

        $now = now()->toDateTimeString();
        $batch = [];
        $fh = fopen($path, 'r');
        if ($fh === false) {
            return;
        }
        while (($line = fgets($fh)) !== false) {
            $word = $this->normalizeLexeme(trim($line));
            if ($word === '') {
                continue;
            }
            $batch[] = [
                'word' => $word,
                'language' => $language,
                'pos' => null,
                'frequency' => $frequency,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            if (count($batch) >= self::INSERT_CHUNK) {
                DB::table('dictionaries')->insertOrIgnore($batch);
                $batch = [];
            }
        }
        fclose($fh);

        if ($batch !== []) {
            DB::table('dictionaries')->insertOrIgnore($batch);
        }
    }

    private function frontendPublicPath(): ?string
    {
        $candidates = [
            base_path('../frontend/public'),
            dirname(base_path(), 2).DIRECTORY_SEPARATOR.'frontend'.DIRECTORY_SEPARATOR.'public',
        ];
        foreach ($candidates as $dir) {
            if (is_dir($dir)) {
                return $dir;
            }
        }

        return null;
    }

    private function normalizeLexeme(string $raw): string
    {
        $lower = mb_strtolower($raw);

        return preg_replace('/[^\p{L}\p{N}\'-]/u', '', $lower) ?? '';
    }

    private function correctWordFromTypoCorpusLine(string $line): ?string
    {
        $line = trim($line);
        if ($line === '' || ! str_contains($line, ':')) {
            return null;
        }
        [$head] = explode(':', $line, 2);
        $head = trim($head);
        if ($head === '') {
            return null;
        }
        $parts = preg_split('/\s+/u', $head, 2);
        $token = $parts[0] ?? '';
        $normalized = $this->normalizeLexeme($token);

        return $normalized !== '' ? $normalized : null;
    }

    private function englishWords(): array
    {
        return [
            ['word' => 'hello', 'language' => 'english', 'pos' => 'Interjection', 'frequency' => 10],
            ['word' => 'good', 'language' => 'english', 'pos' => 'Adjective', 'frequency' => 10],
            ['word' => 'where', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 10],
            ['word' => 'world', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 10],
            ['word' => 'quickly', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'running', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'beautiful', 'language' => 'english', 'pos' => 'Adjective', 'frequency' => 7],
            ['word' => 'buy', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 9],
            ['word' => 'some', 'language' => 'english', 'pos' => 'Determiner', 'frequency' => 10],
            ['word' => 'groceries', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 7],
            ['word' => 'line', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 8],
            ['word' => 'cashier', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 6],
            ['word' => 'movie', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 8],
            ['word' => 'friends', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 9],
            ['word' => 'later', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'meeting', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 8],
            ['word' => 'place', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 9],
            ['word' => 'worth', 'language' => 'english', 'pos' => 'Adjective', 'frequency' => 7],
            ['word' => 'day', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 9],
            ['word' => 'the', 'language' => 'english', 'pos' => 'Determiner', 'frequency' => 10],
            ['word' => 'a', 'language' => 'english', 'pos' => 'Determiner', 'frequency' => 10],
            ['word' => 'to', 'language' => 'english', 'pos' => 'Preposition', 'frequency' => 10],
            ['word' => 'I', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 10],
            ['word' => 'was', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 10],
            ['word' => 'also', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'catch', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 7],
            ['word' => 'with', 'language' => 'english', 'pos' => 'Preposition', 'frequency' => 10],
            ['word' => 'my', 'language' => 'english', 'pos' => 'Determiner', 'frequency' => 10],
            ['word' => 'it', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 10],
            ['word' => 'trying', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'stress', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 7],
            ['word' => 'stressed', 'language' => 'english', 'pos' => 'Adjective', 'frequency' => 6],
            ['word' => 'really', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'because', 'language' => 'english', 'pos' => 'Conjunction', 'frequency' => 9],
            ['word' => 'but', 'language' => 'english', 'pos' => 'Conjunction', 'frequency' => 10],
            ['word' => 'so', 'language' => 'english', 'pos' => 'Conjunction', 'frequency' => 9],
            ['word' => 'that', 'language' => 'english', 'pos' => 'Conjunction', 'frequency' => 10],
            ['word' => 'this', 'language' => 'english', 'pos' => 'Determiner', 'frequency' => 9],
            ['word' => 'have', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 10],
            ['word' => 'has', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 9],
            ['word' => 'had', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 9],
            ['word' => 'can', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 9],
            ['word' => 'will', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 9],
            ['word' => 'would', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'could', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'should', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'very', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'just', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'only', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'even', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'still', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'already', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'always', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'never', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'often', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'sometimes', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'here', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'there', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'when', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'why', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'how', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'what', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 9],
            ['word' => 'which', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 8],
            ['word' => 'who', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 9],
            ['word' => 'he', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 9],
            ['word' => 'she', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 9],
            ['word' => 'we', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 9],
            ['word' => 'they', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 9],
            ['word' => 'you', 'language' => 'english', 'pos' => 'Pronoun', 'frequency' => 10],
            ['word' => 'in', 'language' => 'english', 'pos' => 'Preposition', 'frequency' => 10],
            ['word' => 'on', 'language' => 'english', 'pos' => 'Preposition', 'frequency' => 10],
            ['word' => 'at', 'language' => 'english', 'pos' => 'Preposition', 'frequency' => 10],
            ['word' => 'for', 'language' => 'english', 'pos' => 'Preposition', 'frequency' => 10],
            ['word' => 'from', 'language' => 'english', 'pos' => 'Preposition', 'frequency' => 9],
            ['word' => 'of', 'language' => 'english', 'pos' => 'Preposition', 'frequency' => 10],
            ['word' => 'and', 'language' => 'english', 'pos' => 'Conjunction', 'frequency' => 10],
            ['word' => 'or', 'language' => 'english', 'pos' => 'Conjunction', 'frequency' => 9],
            ['word' => 'if', 'language' => 'english', 'pos' => 'Conjunction', 'frequency' => 9],
            ['word' => 'than', 'language' => 'english', 'pos' => 'Conjunction', 'frequency' => 8],
            ['word' => 'super', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'mall', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 7],
        ];
    }

    private function tagalogWords(): array
    {
        return [
            ['word' => 'kamusta', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 10],
            ['word' => 'kumusta', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 10],
            ['word' => 'salamat', 'language' => 'tagalog', 'pos' => 'Interjection', 'frequency' => 10],
            ['word' => 'paano', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'opo', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'po', 'language' => 'tagalog', 'pos' => 'Particle', 'frequency' => 10],
            ['word' => 'naman', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'lang', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 10],
            ['word' => 'maganda', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 8],
            ['word' => 'ako', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 10],
            ['word' => 'sa', 'language' => 'tagalog', 'pos' => 'Preposition', 'frequency' => 10],
            ['word' => 'kanina', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'pero', 'language' => 'tagalog', 'pos' => 'Conjunction', 'frequency' => 9],
            ['word' => 'sobrang', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'haba', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 7],
            ['word' => 'ng', 'language' => 'tagalog', 'pos' => 'Particle', 'frequency' => 10],
            ['word' => 'talaga', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'kasi', 'language' => 'tagalog', 'pos' => 'Conjunction', 'frequency' => 9],
            ['word' => 'buti', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'na', 'language' => 'tagalog', 'pos' => 'Particle', 'frequency' => 10],
            ['word' => 'mabilis', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 7],
            ['word' => 'sila', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 9],
            ['word' => 'silang', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 8],
            ['word' => 'hindi', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'kaya', 'language' => 'tagalog', 'pos' => 'Conjunction', 'frequency' => 8],
            ['word' => 'kumilos', 'language' => 'tagalog', 'pos' => 'Verb', 'frequency' => 6],
            ['word' => 'pumunta', 'language' => 'tagalog', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'yung', 'language' => 'tagalog', 'pos' => 'Determiner', 'frequency' => 9],
            ['word' => 'namin', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 8],
            ['word' => 'natin', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 8],
            ['word' => 'ko', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 10],
            ['word' => 'mo', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 9],
            ['word' => 'niya', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 8],
            ['word' => 'nila', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 8],
            ['word' => 'atin', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 7],
            ['word' => 'amin', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 7],
            ['word' => 'ito', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 8],
            ['word' => 'iyan', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 7],
            ['word' => 'iyon', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 7],
            ['word' => 'dito', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'doon', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'din', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'rin', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'pa', 'language' => 'tagalog', 'pos' => 'Particle', 'frequency' => 9],
            ['word' => 'ba', 'language' => 'tagalog', 'pos' => 'Particle', 'frequency' => 9],
            ['word' => 'kung', 'language' => 'tagalog', 'pos' => 'Conjunction', 'frequency' => 9],
            ['word' => 'kapag', 'language' => 'tagalog', 'pos' => 'Conjunction', 'frequency' => 7],
            ['word' => 'dahil', 'language' => 'tagalog', 'pos' => 'Conjunction', 'frequency' => 8],
            ['word' => 'bakit', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'saan', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'kailan', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'ano', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 9],
            ['word' => 'sino', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 8],
            ['word' => 'alin', 'language' => 'tagalog', 'pos' => 'Pronoun', 'frequency' => 6],
            ['word' => 'gaano', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 6],
            ['word' => 'mag', 'language' => 'tagalog', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'nag', 'language' => 'tagalog', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'um', 'language' => 'tagalog', 'pos' => 'Verb', 'frequency' => 7],
            ['word' => 'kumain', 'language' => 'tagalog', 'pos' => 'Verb', 'frequency' => 7],
            ['word' => 'tulog', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 7],
            ['word' => 'kain', 'language' => 'tagalog', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'aral', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 7],
            ['word' => 'trabaho', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 8],
            ['word' => 'bahay', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 8],
            ['word' => 'tao', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 9],
            ['word' => 'bata', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 7],
            ['word' => 'oras', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 7],
            ['word' => 'araw', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 7],
            ['word' => 'ganda', 'language' => 'tagalog', 'pos' => 'Noun', 'frequency' => 6],
            ['word' => 'pangit', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 6],
            ['word' => 'malaki', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 7],
            ['word' => 'maliit', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 7],
            ['word' => 'masaya', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 7],
            ['word' => 'malungkot', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 6],
            ['word' => 'sige', 'language' => 'tagalog', 'pos' => 'Interjection', 'frequency' => 8],
            ['word' => 'oo', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'baka', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'marahil', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 6],
            ['word' => 'siguro', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'medyo', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'napaka', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 6],
            ['word' => 'sobra', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'lalo', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'na-stress', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 5],
            ['word' => 'nastress', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 5],
            ['word' => 'na-late', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 5],
            ['word' => 'nalate', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 5],
        ];
    }

    private function taglishWords(): array
    {
        return [
            ['word' => 'pls', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 5],
            ['word' => 'gud', 'language' => 'taglish', 'pos' => 'Adjective', 'frequency' => 5],
            ['word' => 'wer', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 5],
            ['word' => 'na', 'language' => 'taglish', 'pos' => 'Particle', 'frequency' => 8],
            ['word' => 'lang', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'naman', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'kasi', 'language' => 'taglish', 'pos' => 'Conjunction', 'frequency' => 7],
            ['word' => 'po', 'language' => 'taglish', 'pos' => 'Particle', 'frequency' => 7],
            ['word' => 'ng', 'language' => 'taglish', 'pos' => 'Particle', 'frequency' => 8],
            ['word' => 'sa', 'language' => 'taglish', 'pos' => 'Preposition', 'frequency' => 8],
            ['word' => 'yung', 'language' => 'taglish', 'pos' => 'Determiner', 'frequency' => 7],
            ['word' => 'para', 'language' => 'taglish', 'pos' => 'Preposition', 'frequency' => 7],
            ['word' => 'pero', 'language' => 'taglish', 'pos' => 'Conjunction', 'frequency' => 7],
            ['word' => 'talaga', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 7],
            ['word' => 'sobra', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 6],
            ['word' => 'sobrang', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 6],
            ['word' => 'super', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 6],
            ['word' => 'ok', 'language' => 'taglish', 'pos' => 'Adjective', 'frequency' => 7],
            ['word' => 'okay', 'language' => 'taglish', 'pos' => 'Adjective', 'frequency' => 7],
        ];
    }
}
