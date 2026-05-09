<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'address')) {
                $table->string('address')->nullable()->after('amount_format');
            }

            if (! Schema::hasColumn('users', 'phone')) {
                $table->string('phone', 40)->nullable()->after('address');
            }

            if (! Schema::hasColumn('users', 'region')) {
                $table->string('region', 120)->nullable()->after('phone');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach (['region', 'phone', 'address'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
