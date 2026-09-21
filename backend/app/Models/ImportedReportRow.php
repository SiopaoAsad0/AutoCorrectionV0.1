<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportedReportRow extends Model
{
    protected $fillable = [
        'batch',
        'user_email',
        'total_checks',
        'total_words',
        'total_misspelled',
        'avg_correction_rate',
        'avg_word_error_rate',
        'last_active',
    ];
}
