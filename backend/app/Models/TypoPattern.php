<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TypoPattern extends Model
{
    use HasFactory;

    protected $fillable = ['pattern_from', 'pattern_to', 'weight'];

    protected $casts = [
        'weight' => 'float',
    ];

    /**
     * Get substitution weight map for weighted Levenshtein: key "from_to" => weight.
     */
    public static function getSubstitutionWeights(): array
    {
        $rows = static::all();
        $map = [];
        foreach ($rows as $row) {
            $key = $row->pattern_from . '_' . $row->pattern_to;
            $map[$key] = (float) $row->weight;
        }
        return $map;
    }
}
