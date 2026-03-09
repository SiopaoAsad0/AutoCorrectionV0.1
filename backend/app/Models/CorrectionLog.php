<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CorrectionLog extends Model
{
    use HasFactory;

    protected $fillable = ['original_text', 'corrected_text', 'suggestions', 'analytics'];

    protected $casts = [
        'suggestions' => 'array',
        'analytics' => 'array',
    ];
}
