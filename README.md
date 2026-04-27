# AutoCorrectionV0.1 Setup

If someone pulls this project from Git and gets database errors like:

- `Base table or view not found`
- `contact_messages doesn't exist`

the database migrations were not run yet.

## Backend first-time setup

From `backend` folder:

1. Install dependencies
   - `composer install`
2. Create env file (if needed)
   - `copy .env.example .env`
3. Generate app key
   - `php artisan key:generate`
4. Create all tables + seed data
   - `composer run setup-db`
   - or `php artisan migrate --seed`

## Important note

Seeders insert data, but table structure is created by migrations.
So to avoid missing-table errors, always run migrations after pulling new changes.
