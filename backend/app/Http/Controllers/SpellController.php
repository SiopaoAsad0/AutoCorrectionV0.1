<?php

namespace App\Http\Controllers;

use App\Models\CorrectionLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SpellController extends Controller
{
    public function correct(Request $request)
    {
        $request->validate([
            'text' => 'required|string'
        ]);

        $response = Http::post('http://localhost:5000/correct', [
            'text' => $request->text
        ]);

        CorrectionLog::create([
            'original_text' => $request->text,
            'suggestions' => json_encode($response->json())
        ]);

        return response()->json($response->json());
    }
}
