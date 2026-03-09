# How to Run the Spell Correction System

## Prerequisites

- PHP 8.1+ (XAMPP or standalone)
- Composer
- Node.js & npm (for React frontend)
- MySQL (XAMPP) **or** SQLite (no server needed)

## 1. Backend (Laravel)

### Setup

```bash
cd backend
cp .env.example .env
php artisan key:generate
```

### Database

**Option A – MySQL (XAMPP)**  
1. Start XAMPP and turn on **MySQL**.  
2. Create a database, e.g. `spellcheck`.  
3. In `.env` set:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=spellcheck
DB_USERNAME=root
DB_PASSWORD=
```

**Option B – SQLite (easiest for quick test)**  
1. In `.env` set:

```env
DB_CONNECTION=sqlite
# Comment out or leave blank: DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD
```

2. Create the SQLite file:

```bash
cd backend
type nul > database\database.sqlite
# Or on macOS/Linux: touch database/database.sqlite
```

### Migrate and seed

```bash
cd backend
composer install
php artisan migrate --force
php artisan db:seed --force
```

### Start API server

```bash
php artisan serve
```

Backend runs at **http://127.0.0.1:8000**. The spell API is at `POST http://127.0.0.1:8000/api/correct`.

---

## 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173** (or the port Vite shows).

Vite is configured to **proxy `/api`** to `http://127.0.0.1:8000`, so “Run Analysis” in the checker will call the Laravel backend.

---

## 3. Use the app

1. Open **http://localhost:5173** in the browser.  
2. Log in (or sign up) as needed, then go to the **Spell Checker**.  
3. Type or paste text (e.g. “hello world” or “kamusta salamat”).  
4. Click **Run Analysis**.  
5. View the table (word, status, POS), click a word for suggestions, and use the analytics section.  
6. Use **Export (.csv)** to download results.

---

## Troubleshooting

- **“Analysis failed. Is the Laravel backend running on port 8000?”**  
  Start the backend with `php artisan serve` in the `backend` folder.

- **“No connection could be made” (MySQL)**  
  Start MySQL in XAMPP and check `DB_*` in `.env`, or switch to SQLite (see Option B above).

- **Empty or no suggestions**  
  Run `php artisan db:seed --force` so the `dictionaries` table has words. Add more words via seeders or admin if you need better coverage.
