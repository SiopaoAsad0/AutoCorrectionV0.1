<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imported_report_rows', function (Blueprint $table) {
            $table->id();
            $table->string('batch')->index(); // groups rows from the same import
            $table->string('user_email')->nullable();
            $table->unsignedInteger('total_checks')->default(0);
            $table->unsignedInteger('total_words')->default(0);
            $table->unsignedInteger('total_misspelled')->default(0);
            $table->double('avg_correction_rate')->default(0);
            $table->double('avg_word_error_rate')->default(0);
            $table->string('last_active')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imported_report_rows');
    }
};
