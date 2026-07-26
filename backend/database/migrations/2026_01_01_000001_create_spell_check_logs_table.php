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

            // Run summary
            $table->string('user_email')->nullable();
            $table->text('input_text')->nullable();
            $table->unsignedInteger('total_words')->nullable();
            $table->unsignedInteger('correct_words')->nullable();
            $table->unsignedInteger('misspelled_words')->nullable();
            $table->unsignedInteger('suggested_words')->nullable();
            $table->float('correction_rate')->nullable();
            $table->float('word_error_rate')->nullable();
            $table->string('detected_language')->nullable();

            // Per-word correction detail
            $table->string('misspelled_word')->nullable();
            $table->string('suggested_word')->nullable();
            $table->float('suggestion_confidence')->nullable()->after('suggested_word');

            // Algorithm metrics
            $table->unsignedInteger('levenshtein_distance')->nullable();
            $table->float('levenshtein_normalized')->nullable();
            $table->float('jaro_winkler_similarity')->nullable();
            $table->float('jaro_winkler_distance')->nullable();
            $table->float('jaro_similarity')->nullable();
            $table->boolean('algorithm_agreement')->nullable();
            $table->string('preferred_algorithm')->nullable();

            // Edit-distance breakdown
            $table->unsignedInteger('substitutions')->nullable();
            $table->unsignedInteger('insertions')->nullable();
            $table->unsignedInteger('deletions')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spell_check_logs');
    }
};
