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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_account_id')
                ->constrained('accounts')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('to_account_id')
                ->constrained('accounts')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('initiator_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->decimal('amount', 15, 2);
            $table->decimal('fee', 15, 2)->default(0);
            $table->char('currency', 3)->default('EUR');
            $table->string('category', 30)->default('transfer');
            $table->string('status', 20)->default('pending');
            $table->string('reference', 40)->unique();
            $table->text('description')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['category', 'created_at']);
            $table->index(['from_account_id', 'created_at']);
            $table->index(['to_account_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
