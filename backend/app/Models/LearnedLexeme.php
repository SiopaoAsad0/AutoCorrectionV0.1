<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;

class LearnedLexeme extends Model
{
    protected $fillable = ['lexeme', 'frequency'];

    /**
     * Increment usage count for an accepted term (user or system approved).
     */
    public static function bumpFrequency(string $lexeme): int
    {
        $lexeme = mb_strtolower(trim($lexeme));
        $lexeme = preg_replace('/\s+/u', ' ', $lexeme) ?? '';
        if ($lexeme === '') {
            return 0;
        }
        if (mb_strlen($lexeme) > 191) {
            $lexeme = mb_substr($lexeme, 0, 191);
        }

        try {
            $row = static::firstOrNew(['lexeme' => $lexeme]);
            if ($row->exists) {
                $row->increment('frequency');
            } else {
                $row->frequency = 1;
                $row->save();
            }

            return (int) $row->fresh()->frequency;
        } catch (QueryException) {
            // Table may not exist yet on fresh pull before running migrations.
            return 0;
        }
    }
}
