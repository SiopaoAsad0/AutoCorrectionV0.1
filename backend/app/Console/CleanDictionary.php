<?php

namespace App\Console\Commands;

use App\Models\Dictionary;
use Illuminate\Console\Command;

class CleanDictionary extends Command
{
    protected $signature = 'dictionary:clean
                            {--apply : Delete the invalid 1-2 letter rows (default is a dry run)}
                            {--spaces : Also delete rows that contain spaces (review the list first)}';

    protected $description = 'Find (and optionally delete) junk dictionary rows: invalid 1-2 letter words and rows containing spaces';

    public function handle(): int
    {
        $allowed = array_map('mb_strtolower', (array) config('spelling.valid_short_words', []));

        $shortJunk = Dictionary::query()
            ->whereRaw('LENGTH(word) <= 2')
            ->whereNotIn('word', $allowed);

        $spaced = Dictionary::query()->where('word', 'like', '% %');

        $this->report('Invalid 1-2 letter rows', $shortJunk);
        $this->report('Rows containing spaces', $spaced);

        if (! $this->option('apply')) {
            $this->warn('Dry run only. Nothing was deleted. Re-run with --apply to delete the invalid 1-2 letter rows.');

            return self::SUCCESS;
        }

        $deleted = (clone $shortJunk)->delete();
        if ($this->option('spaces')) {
            $deleted += (clone $spaced)->delete();
        }

        $this->info("Deleted {$deleted} rows.");

        return self::SUCCESS;
    }

    private function report(string $title, $query): void
    {
        $this->line($title.': '.(clone $query)->count());

        $rows = (clone $query)->orderByDesc('frequency')->limit(40)->get(['word', 'language', 'frequency']);
        foreach ($rows as $row) {
            $this->line("  {$row->word}  ({$row->language}, frequency {$row->frequency})");
        }
    }
}
