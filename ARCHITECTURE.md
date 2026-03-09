# Automated Spelling Correction System — Architecture Document

**Project:** Automated Spelling Correction for English, Tagalog, and Taglish using Weighted Levenshtein Distance  
**Stack:** React (Frontend) | Laravel v10 (Backend REST API) | MySQL (XAMPP) | PHP NLP Logic  
**Constraint:** No Node.js or external spell engine — all correction logic in Laravel/PHP.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

The system follows a **three-tier, API-driven architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
│  React SPA — Input UI, suggestion display, analytics visualization, export   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ REST (JSON)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER (Laravel)                        │
│  Controllers → Services → Domain Logic                                       │
│  • SpellController (orchestration)                                          │
│  • Tokenization | Weighted Levenshtein | Dictionary | POS | Lang | Analytics │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ Eloquent / Query
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
│  MySQL: dictionaries, typo_patterns, correction_logs (+ optional cache)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Design rationale:**
- **Single responsibility:** Frontend only renders and sends/receives data; backend owns all linguistic and correction logic. This avoids duplication, keeps one source of truth for algorithms, and makes the system defensible for thesis (all NLP in PHP).
- **Layered backend:** Controllers validate and delegate; Services encapsulate algorithms and business rules; Repositories (or Eloquent directly) handle persistence. This supports testing, replacement of implementations (e.g. swap dictionary source), and future AI enhancements.

### 1.2 Request Flow (Spell-Check)

1. User enters text in React → `POST /api/correct` with `{ text: "..." }`.
2. Laravel validates input, then:
   - **Tokenize** text into words (with punctuation handling).
   - **Detect language** (English / Tagalog / Taglish) at sentence or segment level.
   - For each token: **dictionary lookup** → if not found, **weighted Levenshtein** + **suggestion generation**.
   - **POS tagging** (rule-based) for each word.
   - **Analytics** aggregation (counts, correction rate, language, word status).
3. Response: `{ words: [...], analytics: {...}, language: "..." }`.
4. React displays table, suggestions, analytics panel, and export.

### 1.3 Component Ownership

| Concern              | Owner    | Reason |
|----------------------|----------|--------|
| Tokenization         | Laravel  | Part of NLP pipeline; same tokens used for lookup and POS. |
| Weighted Levenshtein | Laravel  | Core algorithm; weights may come from DB (typo_patterns). |
| Dictionary lookup    | Laravel  | Single source (DB/JSON); supports frequency and POS. |
| Suggestion generation| Laravel  | Depends on distance and dictionary. |
| POS tagging          | Laravel  | Rule-based rules and dictionary POS in backend. |
| Language detection   | Laravel  | Uses word-level language cues and dictionary. |
| Analytics            | Laravel  | Computed from backend results. |
| UI / visualization   | React    | Display only; no spell logic. |

---

## 2. Complete Laravel Backend Structure

### 2.1 Directory Layout (Target)

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   └── SpellController.php      # API entry; delegates to services
│   │   │   └── Controller.php
│   │   ├── Requests/
│   │   │   └── CorrectTextRequest.php      # Validation
│   │   └── Middleware/
│   ├── Services/
│   │   ├── Spell/
│   │   │   ├── SpellCorrectionService.php  # Orchestrator: tokenize → correct → analytics
│   │   │   ├── TokenizationService.php     # Split text into words; preserve offsets
│   │   │   ├── WeightedLevenshteinService.php
│   │   │   ├── DictionaryService.php       # Lookup + candidate retrieval
│   │   │   ├── SuggestionService.php       # Rank and limit suggestions
│   │   │   ├── POSTaggingService.php       # Rule-based POS
│   │   │   ├── LanguageDetectionService.php
│   │   │   └── SentenceAnalyticsService.php
│   │   └── ...
│   ├── Models/
│   │   ├── Dictionary.php
│   │   ├── TypoPattern.php
│   │   └── CorrectionLog.php
│   ├── DTOs/ or Value Objects (optional)
│   │   └── WordAnalysisResult.php
│   └── ...
├── config/
│   └── spelling.php                         # Max suggestions, max distance, etc.
├── database/
│   ├── migrations/
│   └── seeders/
│       └── DictionarySeeder.php
├── routes/
│   └── api.php
└── ...
```

**Why this structure:**  
- `Services/Spell/` keeps all spelling-related logic in one place (Single Responsibility, Open/Closed for new algorithms).  
- `SpellCorrectionService` orchestrates the pipeline so the controller stays thin.  
- Validation in Form Request keeps controllers clean and reusable.

### 2.2 Key Backend Design Decisions

- **No external HTTP spell engine:** All logic in PHP services; no dependency on Node or third-party APIs.  
- **Dictionary:** Primary source in MySQL (`dictionaries` table); optional JSON import for seeding.  
- **Weighted Levenshtein:** Implemented in PHP; weights configurable via `typo_patterns` (e.g. common substitutions).  
- **Stateless API:** Each request is independent; session used only if you add auth later.  
- **Logging:** `CorrectionLog` stores original and result for analytics and thesis evaluation.

---

## 3. React Frontend Architecture

### 3.1 Responsibilities (Strict)

- **Input:** Textarea for raw text; optional language hint if we add it later.
- **Display:** Table of words with status (Correct / Misspelled / Suggested); list of suggestions per word; Levenshtein distance per suggestion.
- **Analytics:** Show sentence-level analytics (total words, POS counts, correction rate, language, word status summary).
- **Visualization:** Simple charts or badges for correction rate, language mix, POS distribution (e.g. bar or pie).
- **Export:** CSV/JSON of results and analytics (data comes from API).
- **No:** Tokenization, distance calculation, dictionary, POS rules, or language detection.

### 3.2 Suggested Component Layout

```
frontend/src/
├── api/
│   └── spellApi.js (or .ts)    # axios/fetch wrapper for POST /api/correct
├── components/
│   ├── SpellInput.jsx          # Textarea + Run Analysis / Clear
│   ├── WordResultsTable.jsx    # Table: word, status, POS, suggestions
│   ├── SuggestionPopover.jsx   # Click word → show suggestions (from API data)
│   ├── AnalyticsPanel.jsx      # Totals, correction rate, language, POS breakdown
│   └── ExportButtons.jsx       # CSV / JSON export using API response
├── pages/
│   └── Checker.jsx             # Compose above; state: text, result, selectedWord
├── hooks/
│   └── useSpellCheck.js        # Call API, return { data, loading, error }
└── App.jsx
```

**Why:** Clear separation of API, presentation, and page composition; `useSpellCheck` centralizes loading/error handling and keeps Checker focused on layout.

### 3.3 Data Flow

1. User types → `text` state in Checker.  
2. User clicks "Run Analysis" → `useSpellCheck(text)` or direct `spellApi.correct(text)` → `POST /api/correct`.  
3. API returns `{ words, analytics, language }` → stored in state.  
4. WordResultsTable and AnalyticsPanel read from that state.  
5. Export uses the same state (no recomputation).

---

## 4. Dictionary Design Strategy

### 4.1 Storage Options

| Option | Use case | Pros | Cons |
|--------|----------|------|------|
| **MySQL `dictionaries`** | Production; large lists; multi-language | Queryable, indexable, frequency/POS per word | Need seeding; latency if huge |
| **JSON files** | Bootstrap, small lists, thesis demo | No DB dependency; easy to version | Not scalable for millions of words |
| **Hybrid** | Thesis + production path | Seed from JSON into DB; then use DB | Slightly more logic |

**Recommendation:** Use **MySQL as primary**. Provide seeders that can load from existing JSON/CSV (e.g. `tagalog_dict.json`, `aspell.txt`) so the same data lives in DB. For very large dictionaries, add indexing (e.g. `word`, `language`) and optional in-memory cache (e.g. Redis or PHP array cache per request).

### 4.2 Schema (Enhanced)

Existing migration has: `id, word, language, frequency, timestamps`.

- **Add `pos` (nullable string):** Store primary POS per word (e.g. "Noun", "Verb") for display and for rule-based tagger fallback.  
- **Keep `language`:** `english`, `tagalog`, or `taglish` (for words accepted in mixed context).  
- **Keep `frequency`:** For ranking suggestions (e.g. prefer higher-frequency candidates when distances tie).

New migration (add column):

```php
$table->string('pos', 50)->nullable()->after('language');
```

### 4.3 Lookup Strategy

- **Exact lookup:** Normalize input (lowercase, strip punctuation for lookup only); query `WHERE word = ? AND language IN (?, ?, ?)` or use a single merged view across languages for “any” mode.  
- **Candidate retrieval for suggestions:** For a misspelled word, avoid full-table scan. Options:  
  - **Length filter:** `WHERE LENGTH(word) BETWEEN len-2 AND len+2` (index on `word` or generated column `word_length`).  
  - **Prefix / n-gram index (future):** For very large dictionaries.  
- **Caching:** Per-request cache of “word exists” and “candidates for word W” to avoid repeated queries in the same request.

---

## 5. Weighted Levenshtein Algorithm Implementation Plan (PHP)

### 5.1 Classical Levenshtein

- **Definition:** Minimum cost to transform string A into string B using insertions, deletions, substitutions.  
- **Costs:** Usually 1 per operation.  
- **DP:** `d[i][j]` = min cost to transform `A[1..i]` to `B[1..j]`; recurrence:

  - `d[i][j] = min( d[i-1][j]+del_cost, d[i][j-1]+ins_cost, d[i-1][j-1] + (0 if A[i]=B[j] else sub_cost) )`

### 5.2 Weighted Variant

- **Rationale:** Some edits are more likely (e.g. adjacent key typos, phonetic substitutions). Weights make suggestions more linguistically plausible.  
- **Weights:**  
  - `substitute(a, b)`: from `typo_patterns` (e.g. "e"→"r" weight 0.7) or default 1.0.  
  - `insert(c)`, `delete(c)`: per-character or per-class (e.g. vowel vs consonant); default 1.0.  
- **Implementation:** Same DP recurrence with cost from a **cost function** `cost(op, c1, c2)` (e.g. for substitution, look up `(c1,c2)` in typo_patterns).

### 5.3 PHP Implementation Outline

- **Class:** `WeightedLevenshteinService`.  
- **Methods:**  
  - `distance(string $a, string $b): float` — returns weighted distance.  
  - `setWeights(array $substitutionMatrix, float $defaultInsert, float $defaultDelete)` or load from `TypoPattern::getWeights()`.  
- **Internal:** 2D array (or two rows for space optimization); iterate over `i`, `j`; for each substitution `(a[i], b[j])` look up weight.  
- **Edge:** Empty string; one row/column initialization with insert/delete costs.  
- **Performance:** O(|a|*|b|); for suggestion ranking we only compute distance for candidate words (already filtered by length/dictionary).

### 5.4 Integration with Typo Patterns

- **Table:** `typo_patterns(pattern_from, pattern_to, weight)`.  
- **Usage:** When computing substitution cost for `(char_from, char_to)`, query or cache typo_patterns; if row exists use `weight`, else 1.0.  
- **Cache:** Load all typo patterns once per request (or in a singleton) into `['from_to' => weight]` for O(1) lookup.

---

## 6. Word Suggestion Algorithm

### 6.1 Goal

Given a misspelled word `w`, return an ordered list of suggestions (e.g. top 5) from the dictionary with **weighted Levenshtein distance** and optional **frequency** tie-breaking.

### 6.2 Steps

1. **Normalize:** Lowercase, strip punctuation for lookup (keep original for display).  
2. **Exact match:** If in dictionary, no suggestions (word is correct).  
3. **Candidate set:** Retrieve dictionary entries with `length within ±k` (e.g. k=2) of `strlen(w)` to avoid comparing with very long/short words.  
4. **Score:** For each candidate `c`, compute `d = weighted_levenshtein(w, c)`.  
5. **Rank:** Sort by `(d, -frequency)` (ascending distance, descending frequency).  
6. **Cap:** Return top N (e.g. 5); optionally filter `d <= max_distance` (e.g. 3).  
7. **Enrich:** Attach POS (and optionally language) from dictionary to each suggestion for frontend.

### 6.3 Service Boundary

- **DictionaryService:** `getCandidates(string $normalizedWord, int $lengthTolerance, int $maxCandidates)` — returns list of words (with frequency, pos).  
- **SuggestionService** (or inside SpellCorrectionService): Calls `WeightedLevenshteinService::distance()` for each candidate, sorts, truncates, returns `[{ word, distance, pos, frequency }, ...]`.

---

## 7. POS Tagging Logic Design

### 7.1 Tag Set

- Noun, Verb, Adjective, Adverb, Pronoun, Preposition, Conjunction, Determiner, Interjection.  
- Optional: "Tagalog Verb", "Tagalog Adjective", "Tagalog Noun" for mixed-language clarity.

### 7.2 Rule-Based Approach (No ML)

- **Dictionary first:** If word is in dictionary and `pos` is stored, use it.  
- **Rules (regex/morphology):**  
  - **English:** -ly → Adverb; -ing/-ed/-ate/-ify/-ize → Verb; -able/-ful/-ic/-tion/-ness/-ment → Adjective/Noun; etc.  
  - **Tagalog:** mag-/nag-, -in/-an/-hin, ma- prefix → Verb; ma- adjective, pag-/pang- → Noun; etc.  
  - **Titles:** Dr., Atty., Engr., Mr., Ms. → Noun (Title).  
- **Default:** "Unknown" or "Other" if no rule matches.

### 7.3 Service

- **POSTaggingService::tag(string $word, ?string $language, ?string $dictionaryPos): string**  
  - If `dictionaryPos` present, return it (or map to standard set).  
  - Else apply rule set in order; return first match or "Unknown".  
- **Stateless:** No training; deterministic; suitable for thesis explanation and reproducibility.

---

## 8. Language Detection Logic (English / Tagalog / Taglish)

### 8.1 Level

- **Sentence or segment level:** Classify the whole input (or each sentence) as predominantly English, Tagalog, or Taglish.  
- **Word-level:** Optional; each word can be tagged with detected language for mixed sentences.

### 8.2 Approach

- **Dictionary-based:** For each word, check which language(s) it appears in (english / tagalog).  
- **Counts:** `n_english`, `n_tagalog`, `n_unknown`.  
- **Decision:**  
  - If both n_english and n_tagalog above threshold → **Taglish**.  
  - Else if n_tagalog >> n_english → **Tagalog**.  
  - Else → **English**.  
- **Thresholds:** Tune (e.g. 20% mix → Taglish; else majority).  
- **Fallback:** If no words in dictionary, use heuristics (e.g. Tagalog affixes mag-, nag-, -in) to guess word language, then aggregate.

### 8.3 Service

- **LanguageDetectionService::detect(array $words, array $wordLanguageMap): string**  
  - Input: list of normalized words and per-word language from dictionary (or heuristic).  
  - Output: `"english" | "tagalog" | "taglish"`.

---

## 9. Sentence Analytics System

### 9.1 Metrics to Compute (Backend)

- **Total word count** (after tokenization).  
- **Word categories:** Count per POS (Noun, Verb, etc.).  
- **Per-word Levenshtein distance:** For each corrected/suggested word, store the distance of the chosen suggestion (or min over suggestions).  
- **Correction rate:** `correct_count / total_words` or `(total_words - misspelled_count) / total_words`.  
- **Language classification:** From LanguageDetectionService.  
- **Word status counts:** Correct, Misspelled, Suggested (suggestion available).

### 9.2 Aggregation

- **SentenceAnalyticsService::compute(array $wordResults): array**  
  - Input: list of `{ word, status, pos, suggestions, distance? }`.  
  - Output: `{ total_words, pos_counts, correction_rate, language, status_counts, distances? }`.  
- **Return in API:** Under `analytics` key so frontend can render without recalculation.

---

## 10. Database Schema Design

### 10.1 Tables

- **users** — Laravel default (if auth used).  
- **dictionaries:** `id, word (unique), language, pos (nullable), frequency, timestamps`.  
- **typo_patterns:** `id, pattern_from, pattern_to, weight, timestamps`.  
- **correction_logs:** `id, original_text, corrected_text (nullable), suggestions (json), analytics (json nullable), timestamps`.  
- **personal_access_tokens** — Laravel Sanctum (if API auth added).

### 10.2 Indexes

- `dictionaries`: unique on `(word, language)` or keep `word` unique if one entry per word across languages; index on `language`, and optionally `word_length` for candidate query.  
- `typo_patterns`: index on `(pattern_from, pattern_to)` for fast lookup.  
- `correction_logs`: index on `created_at` for recent logs.

### 10.3 Enums / Conventions

- `language`: `'english' | 'tagalog' | 'taglish'`.  
- `pos`: Standard set (Noun, Verb, …).  
- `suggestions` / `analytics`: JSON for flexibility and thesis reporting.

---

## 11. REST API Endpoint Design

### 11.1 POST /api/correct

- **Request:** `{ "text": "string" }`.  
- **Validation:** `text` required, string, max length (e.g. 10000).  
- **Response (200):**

```json
{
  "words": [
    {
      "word": "original",
      "normalized": "original",
      "status": "correct|misspelled|suggested",
      "pos": "Noun",
      "suggestions": [
        { "word": "suggestion", "distance": 1.0, "pos": "Noun", "frequency": 10 }
      ],
      "distance": null
    }
  ],
  "analytics": {
    "total_words": 5,
    "pos_counts": { "Noun": 2, "Verb": 1, "Adjective": 1 },
    "correction_rate": 0.8,
    "language": "taglish",
    "status_counts": { "correct": 4, "misspelled": 1, "suggested": 1 }
  },
  "language": "taglish"
}
```

- **Errors:** 422 validation error; 500 with message (no stack in production).

### 11.2 Optional Endpoints

- **GET /api/dictionary/stats** — Count by language (for admin or thesis).  
- **POST /api/correct/log** — If logging is done as a separate step (otherwise done inside POST /api/correct).

---

## 12. React Integration Flow

1. User enters text → `text` state.  
2. "Run Analysis" → `POST /api/correct` with `{ text }`.  
3. Store response in state: `result = { words, analytics, language }`.  
4. **Table:** Map `result.words` to rows (word, status, POS, suggestions).  
5. **Click word:** If misspelled/suggested, show popover with `word.suggestions` (word, distance, POS).  
6. **Replace:** Update local `text` (and optionally re-call API or just update table state).  
7. **Analytics panel:** Read `result.analytics` (totals, correction rate, language, POS breakdown).  
8. **Export:** Build CSV/JSON from `result` and trigger download.

---

## 13. Performance Optimization Strategy

- **Dictionary:** Index on `word` (and `language`); length filter for candidates; optional Redis cache for “word exists” and top candidates per length bucket.  
- **Levenshtein:** Only run on candidate set (size limited by length filter and optionally by prefix).  
- **Typo patterns:** Load once per request; in-memory map.  
- **Logging:** Async write for `correction_logs` (queue) if volume is high.  
- **Frontend:** Debounce not needed for “Run Analysis” (explicit button); avoid re-fetch on every keystroke.

---

## 14. Security and Validation Strategy

- **Input:** Max length, strip or reject control characters; sanitize for storage.  
- **Output:** JSON only; no HTML in API responses; CORS configured for frontend origin.  
- **Rate limiting:** Throttle `POST /api/correct` per IP or per user if auth enabled.  
- **Logging:** Do not log sensitive user data in plain text in production; optionally anonymize or hash.  
- **SQL:** Eloquent/parameterized queries only; no raw user input in queries.

---

## 15. Deployment Strategy

- **Backend:** Laravel on PHP-FPM (or Apache/Nginx); `.env` for DB and app URL; `php artisan migrate` and `db:seed` for dictionaries.  
- **Frontend:** Build (`npm run build`); serve from Laravel `public/` or separate static host; set `API_BASE_URL` to backend.  
- **Database:** MySQL (XAMPP for dev); ensure charset utf8mb4 for Tagalog.  
- **Thesis demo:** Single machine; Laravel serves API and optionally static build; document port and CORS.

---

## 16. Future AI Improvements

- **Weighted Levenshtein:** Train or tune substitution weights from typo corpora (e.g. store in `typo_patterns`).  
- **Context-aware suggestions:** Use n-gram or simple language model to rank suggestions by sentence context.  
- **Neural spell-checker:** Replace or augment rule-based suggestion with a small transformer/RNN model (export to ONNX or run via separate service; still no Node dependency if served from PHP or Python microservice).  
- **POS:** Integrate a pre-trained POS tagger (e.g. via API or local model) for higher accuracy while keeping current rules as fallback.  
- **Language detection:** Add embedding-based or classifier-based sentence-level model for better Taglish detection.

---

*This document defines the target architecture for the Automated Spelling Correction System. Implementation should follow these sections for a clean, scalable, and thesis-defensible design.*
