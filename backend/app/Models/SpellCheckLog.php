<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpellCheckLog extends Model
{
    protected $fillable = [
        'user_email',
        'input_text',
        'total_words',
        'correct_words',
        'misspelled_words',
        'suggested_words',
        'correction_rate',
        'word_error_rate',
        'detected_language',
        'misspelled_word',
        'suggested_word',
        'levenshtein_distance',
        'levenshtein_normalized',
        'jaro_winkler_similarity',
        'jaro_winkler_distance',
        'jaro_similarity',
        'algorithm_agreement',
        'preferred_algorithm',
        'substitutions',
        'insertions',
        'deletions',
    ];

    protected $casts = [
        'algorithm_agreement' => 'boolean',
        'correction_rate'     => 'float',
        'word_error_rate'     => 'float',
    ];
}
