<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dictionaries', function (Blueprint $table) {
            $table->string('pos', 50)->nullable()->after('language');
        });

        Schema::table('correction_logs', function (Blueprint $table) {
            $table->json('analytics')->nullable()->after('suggestions');
        });
    }

    public function down(): void
    {
        Schema::table('dictionaries', function (Blueprint $table) {
            $table->dropColumn('pos');
        });
        Schema::table('correction_logs', function (Blueprint $table) {
            $table->dropColumn('analytics');
        });
    }
};
