<?php

return [
    'max_suggestions' => 5,
    'max_levenshtein_distance' => 3,
    'length_tolerance' => 2,
    'languages' => ['english', 'tagalog', 'taglish'],
    'use_thesaurus' => env('SPELLING_USE_THESAURUS', true),
    'auto_seed_dictionary' => env('SPELLING_AUTO_SEED_DICTIONARY', true),

    /*
    | Base costs for adapted Levenshtein (insert / delete / default substitute).
    | Per-pair substitute overrides still come from typo_patterns when present.
    */
    'edit_costs' => [
        'insert' => 1.0,
        'delete' => 1.0,
        'substitute' => 1.0,
    ],
];
