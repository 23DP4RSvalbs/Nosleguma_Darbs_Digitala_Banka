<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'country')) {
                $table->string('country', 2)->nullable()->after('region');
            }

            if (! Schema::hasColumn('users', 'postal_code')) {
                $table->string('postal_code', 20)->nullable()->after('country');
            }

            if (! Schema::hasColumn('users', 'phone_country')) {
                $table->string('phone_country', 8)->nullable()->default('+371')->after('postal_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach (['phone_country', 'postal_code', 'country'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
