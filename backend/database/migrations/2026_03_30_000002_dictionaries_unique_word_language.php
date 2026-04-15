<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Allow the same surface form in more than one language (e.g. "na" in Tagalog vs Taglish).
     */
    public function up(): void
    {
        Schema::table('dictionaries', function (Blueprint $table) {
            $table->dropUnique(['word']);
            $table->unique(['word', 'language']);
        });
    }

    public function down(): void
    {
        Schema::table('dictionaries', function (Blueprint $table) {
            $table->dropUnique(['word', 'language']);
            $table->unique(['word']);
        });
    }
};
