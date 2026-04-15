<?php

namespace App\Http\Controllers;

use App\Models\Dictionary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AdminDictionaryController extends Controller
{
    private const INSERT_CHUNK = 600;

    public function datasets(Request $request): JsonResponse
    {
        $root = $this->datasetsRoot();
        if ($root === null) {
            return response()->json([
                'root' => null,
                'message' => 'Dataset folder not found (expected frontend/public).',
                'files' => [],
            ]);
        }

        $files = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iterator as $file) {
            if (! $file->isFile()) {
                continue;
            }
            $ext = strtolower($file->getExtension());
            if (! in_array($ext, ['txt', 'csv', 'json'], true)) {
                continue;
            }
            $full = $file->getPathname();
            $rel = ltrim(str_replace(str_replace('\\', '/', $root), '', str_replace('\\', '/', $full)), '/');
            $files[] = [
                'path' => $rel,
                'bytes' => $file->getSize(),
            ];
        }
        usort($files, fn ($a, $b) => strcmp($a['path'], $b['path']));

        return response()->json([
            'root' => $root,
            'files' => $files,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'language' => ['nullable', 'in:english,tagalog,taglish'],
            'q' => ['nullable', 'string', 'max:200'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = Dictionary::query()->orderBy('word');

        if ($request->filled('language')) {
            $q->where('language', $request->string('language'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $q->where('word', 'like', $term);
        }

        $perPage = (int) $request->input('per_page', 25);

        return response()->json($q->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'word' => ['required', 'string', 'max:255'],
            'language' => ['required', 'in:english,tagalog,taglish'],
            'pos' => ['nullable', 'string', 'max:50'],
            'frequency' => ['nullable', 'integer', 'min:1', 'max:1000000'],
        ]);

        $normalized = $this->normalizeLexeme($data['word']);
        if ($normalized === '') {
            return response()->json(['message' => 'Word is empty after normalization.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $row = Dictionary::create([
                'word' => $normalized,
                'language' => $data['language'],
                'pos' => $data['pos'] ?? null,
                'frequency' => $data['frequency'] ?? 1,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000' || str_contains($e->getMessage(), 'Duplicate')) {
                return response()->json(['message' => 'This word already exists for that language.'], Response::HTTP_CONFLICT);
            }
            throw $e;
        }

        return response()->json($row, Response::HTTP_CREATED);
    }

    public function update(Request $request, Dictionary $dictionary): JsonResponse
    {
        $data = $request->validate([
            'word' => ['sometimes', 'string', 'max:255'],
            'language' => ['sometimes', 'in:english,tagalog,taglish'],
            'pos' => ['nullable', 'string', 'max:50'],
            'frequency' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
        ]);

        if (isset($data['word'])) {
            $normalized = $this->normalizeLexeme($data['word']);
            if ($normalized === '') {
                return response()->json(['message' => 'Word is empty after normalization.'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $data['word'] = $normalized;
        }

        $dictionary->update($data);

        return response()->json($dictionary->fresh());
    }

    public function destroy(Dictionary $dictionary): JsonResponse
    {
        $dictionary->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    /**
     * One word or phrase per line (normalized to a single lexeme like the seeder).
     */
    public function importLines(Request $request): JsonResponse
    {
        $data = $request->validate([
            'text' => ['required', 'string', 'max:2000000'],
            'language' => ['required', 'in:english,tagalog,taglish'],
            'frequency' => ['nullable', 'integer', 'min:1', 'max:1000000'],
        ]);

        $frequency = $data['frequency'] ?? 1;
        $language = $data['language'];
        $now = now()->toDateTimeString();
        $batch = [];
        $inserted = 0;

        foreach (preg_split("/\r\n|\n|\r/", $data['text']) as $line) {
            $word = $this->normalizeLexeme(trim($line));
            if ($word === '') {
                continue;
            }
            $batch[] = [
                'word' => $word,
                'language' => $language,
                'pos' => null,
                'frequency' => $frequency,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            if (count($batch) >= self::INSERT_CHUNK) {
                $inserted += $this->insertIgnoreCount($batch);
                $batch = [];
            }
        }
        if ($batch !== []) {
            $inserted += $this->insertIgnoreCount($batch);
        }

        return response()->json(['inserted_rows' => $inserted]);
    }

    /**
     * Import lines from a file under frontend/public (same sources as DictionarySeeder).
     */
    public function importDataset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'path' => ['required', 'string', 'max:500'],
            'language' => ['required', 'in:english,tagalog,taglish'],
            'frequency' => ['nullable', 'integer', 'min:1', 'max:1000000'],
        ]);

        $relative = str_replace(['\\', "\0"], ['/', ''], $data['path']);
        if (str_contains($relative, '..') || ! preg_match('#^[a-zA-Z0-9_./\-]+$#', $relative)) {
            return response()->json(['message' => 'Invalid path.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $root = $this->datasetsRoot();
        if ($root === null) {
            return response()->json(['message' => 'Dataset root not found.'], Response::HTTP_NOT_FOUND);
        }

        $full = $root.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
        $realRoot = realpath($root);
        $realFile = realpath($full);
        if ($realRoot === false || $realFile === false || ! str_starts_with($realFile, $realRoot)) {
            return response()->json(['message' => 'File not found or outside dataset root.'], Response::HTTP_NOT_FOUND);
        }

        if (! is_readable($realFile)) {
            return response()->json(['message' => 'File not readable.'], Response::HTTP_NOT_FOUND);
        }

        $frequency = $data['frequency'] ?? 1;
        $language = $data['language'];
        $now = now()->toDateTimeString();
        $batch = [];
        $inserted = 0;

        $fh = fopen($realFile, 'r');
        if ($fh === false) {
            return response()->json(['message' => 'Could not open file.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
        while (($line = fgets($fh)) !== false) {
            $word = $this->normalizeLexeme(trim($line));
            if ($word === '') {
                continue;
            }
            $batch[] = [
                'word' => $word,
                'language' => $language,
                'pos' => null,
                'frequency' => $frequency,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            if (count($batch) >= self::INSERT_CHUNK) {
                $inserted += $this->insertIgnoreCount($batch);
                $batch = [];
            }
        }
        fclose($fh);
        if ($batch !== []) {
            $inserted += $this->insertIgnoreCount($batch);
        }

        return response()->json(['inserted_rows' => $inserted, 'path' => $relative]);
    }

    private function insertIgnoreCount(array $batch): int
    {
        if ($batch === []) {
            return 0;
        }
        $n = DB::table('dictionaries')->insertOrIgnore($batch);

        return is_int($n) ? $n : (int) $n;
    }

    private function normalizeLexeme(string $raw): string
    {
        $lower = mb_strtolower($raw);

        return preg_replace('/[^\p{L}\p{N}\'-]/u', '', $lower) ?? '';
    }

    private function datasetsRoot(): ?string
    {
        $candidates = [
            base_path('../frontend/public'),
            dirname(base_path(), 2).DIRECTORY_SEPARATOR.'frontend'.DIRECTORY_SEPARATOR.'public',
        ];
        foreach ($candidates as $dir) {
            if (is_dir($dir)) {
                return realpath($dir) ?: $dir;
            }
        }

        return null;
    }
}
