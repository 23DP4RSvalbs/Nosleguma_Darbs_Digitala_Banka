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
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('iban', 34)->unique();
            $table->string('name', 120);
            $table->char('currency', 3)->default('EUR');
            $table->decimal('balance', 15, 2)->default(0);
            $table->string('type', 20)->default('personal');
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->index(['owner_user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
