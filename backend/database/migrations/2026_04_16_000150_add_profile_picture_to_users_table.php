<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'profile_picture')) {
                $table->string('profile_picture', 2048)->nullable()->after('require_payment_confirmation');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'profile_picture')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('profile_picture');
            });
        }
    }
};
