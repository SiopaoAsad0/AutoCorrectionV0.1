<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LearnedLexemeSeeder extends Seeder
{
    private const INSERT_CHUNK = 600;

    public function run(): void
    {
        if (! Schema::hasTable('learned_lexemes')) {
            return;
        }

        $path = base_path('database/seeders/data/custom_learned_lexemes_dataset.json');
        if (! is_readable($path)) {
            return;
        }

        $raw = file_get_contents($path);
        if (! is_string($raw) || trim($raw) === '') {
            return;
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return;
        }

        $now = now()->toDateTimeString();
        $batch = [];

        foreach ($decoded as $row) {
            if (! is_array($row)) {
                continue;
            }

            $lexeme = $this->normalizeLexeme((string) ($row['lexeme'] ?? ''));
            if ($lexeme === '') {
                continue;
            }

            $frequency = (int) ($row['frequency'] ?? 1);
            if ($frequency < 1) {
                $frequency = 1;
            }

            $batch[] = [
                'lexeme' => $lexeme,
                'frequency' => $frequency,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($batch) >= self::INSERT_CHUNK) {
                DB::table('learned_lexemes')->upsert(
                    $batch,
                    ['lexeme'],
                    ['frequency', 'updated_at']
                );
                $batch = [];
            }
        }

        if ($batch !== []) {
            DB::table('learned_lexemes')->upsert(
                $batch,
                ['lexeme'],
                ['frequency', 'updated_at']
            );
        }
    }

    private function normalizeLexeme(string $raw): string
    {
        $lower = mb_strtolower(trim($raw));
        $singleSpaced = preg_replace('/\s+/u', ' ', $lower) ?? '';

        return mb_substr($singleSpaced, 0, 191);
    }
}
