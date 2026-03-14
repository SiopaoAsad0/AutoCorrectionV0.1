<?php

return [
    'max_suggestions' => 5,
    'max_levenshtein_distance' => 3,
    'length_tolerance' => 2,
    'languages' => ['english', 'tagalog', 'taglish'],
    'use_thesaurus' => env('SPELLING_USE_THESAURUS', true),
];
