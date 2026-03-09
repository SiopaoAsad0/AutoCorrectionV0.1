<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dictionary extends Model
{
    use HasFactory;

    protected $fillable = ['word', 'language', 'pos', 'frequency'];

    protected $casts = [
        'frequency' => 'integer',
    ];

    /**
     * Scope: words by language(s).
     */
    public function scopeLanguages($query, array $languages)
    {
        return $query->whereIn('language', $languages);
    }

    /**
     * Scope: candidate words for suggestions (length within tolerance).
     */
    public function scopeLengthWithin($query, int $length, int $tolerance = 2)
    {
        return $query->whereRaw('LENGTH(word) BETWEEN ? AND ?', [
            max(1, $length - $tolerance),
            $length + $tolerance,
        ]);
    }
}
