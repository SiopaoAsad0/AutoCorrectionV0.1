<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learned_lexemes', function (Blueprint $table) {
            $table->id();
            $table->string('lexeme', 191)->unique();
            $table->unsignedInteger('frequency')->default(1);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learned_lexemes');
    }
};
