<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spell_check_logs', function (Blueprint $table) {
            $table->id();
            $table->string('user_email')->nullable()->index();
            $table->text('input_text')->nullable();
            $table->integer('total_words')->default(0);
            $table->integer('correct_words')->default(0);
            $table->integer('misspelled_words')->default(0);
            $table->integer('suggested_words')->default(0);
            $table->float('correction_rate')->default(0);
            $table->float('word_error_rate')->default(0);
            $table->string('detected_language')->nullable();
            // Per-word error logging (one row per misspelled word)
            $table->string('misspelled_word')->nullable()->index();
            $table->string('suggested_word')->nullable();
            $table->float('levenshtein_distance')->nullable();
            $table->float('levenshtein_normalized')->nullable();
            $table->float('jaro_winkler_similarity')->nullable();
            $table->float('jaro_winkler_distance')->nullable();
            $table->float('jaro_similarity')->nullable();
            $table->boolean('algorithm_agreement')->nullable();
            $table->string('preferred_algorithm')->nullable();
            $table->integer('substitutions')->nullable();
            $table->integer('insertions')->nullable();
            $table->integer('deletions')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spell_check_logs');
    }
};
