<?php

namespace Database\Seeders;

use App\Models\Dictionary;
use Illuminate\Database\Seeder;

class DictionarySeeder extends Seeder
{
    public function run(): void
    {
        $words = [
            ['word' => 'hello', 'language' => 'english', 'pos' => 'Interjection', 'frequency' => 10],
            ['word' => 'good', 'language' => 'english', 'pos' => 'Adjective', 'frequency' => 10],
            ['word' => 'where', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 10],
            ['word' => 'world', 'language' => 'english', 'pos' => 'Noun', 'frequency' => 10],
            ['word' => 'quickly', 'language' => 'english', 'pos' => 'Adverb', 'frequency' => 8],
            ['word' => 'running', 'language' => 'english', 'pos' => 'Verb', 'frequency' => 8],
            ['word' => 'beautiful', 'language' => 'english', 'pos' => 'Adjective', 'frequency' => 7],
            ['word' => 'kamusta', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 10],
            ['word' => 'kumusta', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 10],
            ['word' => 'salamat', 'language' => 'tagalog', 'pos' => 'Interjection', 'frequency' => 10],
            ['word' => 'paano', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'opo', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'po', 'language' => 'tagalog', 'pos' => 'Particle', 'frequency' => 10],
            ['word' => 'naman', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 9],
            ['word' => 'lang', 'language' => 'tagalog', 'pos' => 'Adverb', 'frequency' => 10],
            ['word' => 'maganda', 'language' => 'tagalog', 'pos' => 'Adjective', 'frequency' => 8],
            ['word' => 'pls', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 5],
            ['word' => 'gud', 'language' => 'taglish', 'pos' => 'Adjective', 'frequency' => 5],
            ['word' => 'wer', 'language' => 'taglish', 'pos' => 'Adverb', 'frequency' => 5],
        ];

        foreach ($words as $entry) {
            Dictionary::firstOrCreate(
                ['word' => $entry['word'], 'language' => $entry['language']],
                $entry
            );
        }
    }
}
