<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DictionarySeeder extends Seeder
{
    $words = [
        ['word' => 'hello', 'language' => 'english'],
        ['word' => 'good', 'language' => 'english'],
        ['word' => 'where', 'language' => 'english'],
        ['word' => 'kamusta', 'language' => 'tagalog'],
        ['word' => 'kumusta', 'language' => 'tagalog'],
        ['word' => 'salamat', 'language' => 'tagalog'],
        ['word' => 'paano', 'language' => 'tagalog'],
        ['word' => 'opo', 'language' => 'tagalog'],
        ['word' => 'po', 'language' => 'tagalog'],
        ['word' => 'naman', 'language' => 'tagalog'],
        ['word' => 'lang', 'language' => 'tagalog'],
        ['word' => 'pls', 'language' => 'taglish'],
        ['word' => 'gud', 'language' => 'taglish'],
        ['word' => 'wer', 'language' => 'taglish'],
    ];

    foreach ($words as $word) {
        Dictionary::create($word);
    }
}
