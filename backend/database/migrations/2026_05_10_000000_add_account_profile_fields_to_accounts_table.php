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
        Schema::table('accounts', function (Blueprint $table) {
            $table->string('company_name', 120)->nullable()->after('type');
            $table->string('registration_number', 20)->nullable()->after('company_name');
            $table->string('vat_number', 20)->nullable()->after('registration_number');
            $table->string('first_name', 40)->nullable()->after('vat_number');
            $table->string('last_name', 40)->nullable()->after('first_name');
            $table->string('personal_code', 12)->nullable()->after('last_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn([
                'company_name',
                'registration_number',
                'vat_number',
                'first_name',
                'last_name',
                'personal_code',
            ]);
        });
    }
};