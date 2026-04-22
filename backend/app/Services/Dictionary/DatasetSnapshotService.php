<?php

namespace App\Services\Dictionary;

use App\Models\Dictionary;

class DatasetSnapshotService
{
    /**
     * Export current dictionaries table into a git-trackable JSON snapshot for seeders.
     *
     * @return int Number of rows exported.
     */
    public function syncFromDatabase(): int
    {
        $rows = Dictionary::query()
            ->orderBy('language')
            ->orderBy('word')
            ->get(['word', 'language', 'pos', 'frequency'])
            ->map(function ($row) {
                return [
                    'word' => (string) $row->word,
                    'language' => (string) $row->language,
                    'pos' => $row->pos !== null ? (string) $row->pos : null,
                    'frequency' => (int) $row->frequency,
                ];
            })
            ->all();

        $path = $this->snapshotPath();
        $dir = dirname($path);
        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        file_put_contents(
            $path,
            json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).PHP_EOL,
            LOCK_EX
        );

        return count($rows);
    }

    public function snapshotPath(): string
    {
        return base_path('database/seeders/data/custom_dictionary_dataset.json');
    }
}

