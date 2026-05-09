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
            if (! Schema::hasColumn('users', 'default_dashboard_view')) {
                $table->string('default_dashboard_view', 24)->default('overview')->after('compact_mode');
            }

            if (! Schema::hasColumn('users', 'mask_balances')) {
                $table->boolean('mask_balances')->default(false)->after('default_dashboard_view');
            }

            if (! Schema::hasColumn('users', 'require_payment_confirmation')) {
                $table->boolean('require_payment_confirmation')->default(true)->after('mask_balances');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $dropColumns = [];

            foreach (['default_dashboard_view', 'mask_balances', 'require_payment_confirmation'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $dropColumns[] = $column;
                }
            }

            if (! empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });
    }
};
