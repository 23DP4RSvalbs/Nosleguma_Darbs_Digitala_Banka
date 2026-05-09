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
        if (Schema::hasColumn('users', 'phone')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('phone');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'locale')) {
                $table->string('locale', 8)->default('lv')->after('preferred_currency');
            }

            if (! Schema::hasColumn('users', 'timezone')) {
                $table->string('timezone', 64)->default('Europe/Riga')->after('locale');
            }

            if (! Schema::hasColumn('users', 'date_format')) {
                $table->string('date_format', 20)->default('dd.mm.yyyy')->after('timezone');
            }

            if (! Schema::hasColumn('users', 'amount_format')) {
                $table->string('amount_format', 20)->default('local')->after('date_format');
            }

            if (! Schema::hasColumn('users', 'email_notifications')) {
                $table->boolean('email_notifications')->default(true)->after('amount_format');
            }

            if (! Schema::hasColumn('users', 'push_notifications')) {
                $table->boolean('push_notifications')->default(true)->after('email_notifications');
            }

            if (! Schema::hasColumn('users', 'marketing_notifications')) {
                $table->boolean('marketing_notifications')->default(false)->after('push_notifications');
            }

            if (! Schema::hasColumn('users', 'compact_mode')) {
                $table->boolean('compact_mode')->default(false)->after('marketing_notifications');
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

            foreach ([
                'locale',
                'timezone',
                'date_format',
                'amount_format',
                'email_notifications',
                'push_notifications',
                'marketing_notifications',
                'compact_mode',
            ] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $dropColumns[] = $column;
                }
            }

            if (! empty($dropColumns)) {
                $table->dropColumn($dropColumns);
            }
        });

        if (! Schema::hasColumn('users', 'phone')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('phone', 32)->nullable()->after('email');
            });
        }
    }
};
