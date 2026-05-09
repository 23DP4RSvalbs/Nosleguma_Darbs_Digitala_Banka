<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountMember;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransactionApiTest extends TestCase
{
    use RefreshDatabase;

    private int $ibanSequence = 1000000000;

    public function test_user_can_create_transaction_filter_list_and_view_stats(): void
    {
        $sender = $this->createUser('sender@example.com');
        $receiver = $this->createUser('receiver@example.com');

        $fromAccount = $this->createAccountForUser($sender, [
            'balance' => 500,
            'name' => 'Sender Account',
        ]);
        $toAccount = $this->createAccountForUser($receiver, [
            'balance' => 100,
            'name' => 'Receiver Account',
        ]);

        Sanctum::actingAs($sender);

        $createResponse = $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 120,
            'fee' => 2,
            'category' => 'transfer',
            'description' => 'Monthly transfer',
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('message', 'Transaction pending approval')
            ->assertJsonPath('transaction.status', 'pending');

        $transactionId = (int) $createResponse->json('transaction.id');

        $this->assertDatabaseHas('transactions', [
            'id' => $transactionId,
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'status' => 'pending',
        ]);

        $this->assertSame('500.00', $fromAccount->fresh()->balance);
        $this->assertSame('100.00', $toAccount->fresh()->balance);
        $this->assertDatabaseCount('bank_notifications', 1);

        $this->getJson('/api/transactions?category=transfer&amount_min=100&amount_max=150&sort_by=amount&sort_dir=asc')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $transactionId,
                'category' => 'transfer',
            ]);

        $this->getJson('/api/transactions/'.$transactionId)
            ->assertOk()
            ->assertJsonPath('transaction.id', $transactionId);

        $statsResponse = $this->getJson('/api/transactions/stats')
            ->assertOk();

        $this->assertSame(0.0, (float) $statsResponse->json('totals.outflow'));
        $this->assertSame(0.0, (float) $statsResponse->json('totals.inflow'));
        $this->assertSame(0.0, (float) $statsResponse->json('totals.net'));
        $this->assertSame([], $statsResponse->json('monthly_activity'));

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $sender->id,
            'event_type' => 'transaction.created',
            'resource_id' => $transactionId,
        ]);
    }

    public function test_transaction_creation_fails_with_insufficient_balance(): void
    {
        $sender = $this->createUser('low-balance@example.com');
        $receiver = $this->createUser('receiver-low@example.com');

        $fromAccount = $this->createAccountForUser($sender, ['balance' => 10]);
        $toAccount = $this->createAccountForUser($receiver, ['balance' => 50]);

        Sanctum::actingAs($sender);

        $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 25,
            'fee' => 1,
            'category' => 'transfer',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Insufficient funds');

        $this->assertDatabaseCount('transactions', 0);
        $this->assertSame('10.00', $fromAccount->fresh()->balance);
        $this->assertSame('50.00', $toAccount->fresh()->balance);
    }

    public function test_user_can_update_and_delete_own_pending_transaction(): void
    {
        $user = $this->createUser('pending-owner@example.com');
        $other = $this->createUser('pending-other@example.com');

        $fromAccount = $this->createAccountForUser($user, ['balance' => 100]);
        $toAccount = $this->createAccountForUser($other, ['balance' => 50]);

        $transaction = Transaction::query()->create([
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'initiator_user_id' => $user->id,
            'amount' => 20,
            'fee' => 0,
            'currency' => 'EUR',
            'category' => 'other',
            'status' => 'pending',
            'reference' => 'PENDINGREF001',
            'description' => 'Initial draft',
            'executed_at' => null,
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/transactions/'.$transaction->id, [
            'description' => 'Updated draft',
            'category' => 'shopping',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Transaction updated')
            ->assertJsonPath('transaction.description', 'Updated draft')
            ->assertJsonPath('transaction.category', 'shopping');

        $this->deleteJson('/api/transactions/'.$transaction->id)
            ->assertOk()
            ->assertJsonPath('message', 'Transaction deleted');

        $this->assertDatabaseMissing('transactions', [
            'id' => $transaction->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event_type' => 'transaction.updated',
            'resource_id' => $transaction->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event_type' => 'transaction.deleted',
            'resource_id' => $transaction->id,
        ]);
    }

    public function test_viewer_member_can_initiate_transfer_but_cannot_approve(): void
    {
        $owner = $this->createUser('viewer-owner@example.com');
        $viewer = $this->createUser('viewer-member@example.com');
        $receiver = $this->createUser('viewer-receiver@example.com');

        $fromAccount = $this->createAccountForUser($owner, ['balance' => 500]);
        $toAccount = $this->createAccountForUser($receiver, ['balance' => 0]);

        AccountMember::query()->create([
            'account_id' => $fromAccount->id,
            'user_id' => $viewer->id,
            'member_role' => 'viewer',
            'daily_limit' => 100,
        ]);

        Sanctum::actingAs($viewer);

        $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 10,
            'fee' => 0,
            'category' => 'transfer',
        ])
            ->assertCreated()
            ->assertJsonPath('message', 'Transaction pending approval')
            ->assertJsonPath('transaction.status', 'pending');

        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_member_daily_limit_is_enforced_on_source_account(): void
    {
        $owner = $this->createUser('limit-owner@example.com');
        $operator = $this->createUser('limit-operator@example.com');
        $receiver = $this->createUser('limit-receiver@example.com');

        $fromAccount = $this->createAccountForUser($owner, ['balance' => 1000]);
        $toAccount = $this->createAccountForUser($receiver, ['balance' => 0]);

        AccountMember::query()->create([
            'account_id' => $fromAccount->id,
            'user_id' => $operator->id,
            'member_role' => 'operator',
            'daily_limit' => 100,
        ]);

        Sanctum::actingAs($operator);

        $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 80,
            'fee' => 0,
            'category' => 'transfer',
        ])
            ->assertCreated()
            ->assertJsonPath('message', 'Transaction pending approval');

        $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 30,
            'fee' => 0,
            'category' => 'transfer',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Daily transfer limit exceeded');

        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_approver_member_cannot_initiate_transfer(): void
    {
        $owner = $this->createUser('approver-owner-block@example.com');
        $approver = $this->createUser('approver-block@example.com');
        $receiver = $this->createUser('approver-receiver-block@example.com');

        $fromAccount = $this->createAccountForUser($owner, ['balance' => 500]);
        $toAccount = $this->createAccountForUser($receiver, ['balance' => 0]);

        AccountMember::query()->create([
            'account_id' => $fromAccount->id,
            'user_id' => $approver->id,
            'member_role' => 'approver',
            'daily_limit' => 500,
        ]);

        Sanctum::actingAs($approver);

        $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 10,
            'fee' => 0,
            'category' => 'transfer',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'Member role cannot initiate transfers');

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_high_value_transfer_is_created_as_pending_when_secondary_approver_exists(): void
    {
        $owner = $this->createUser('approval-owner@example.com');
        $operator = $this->createUser('approval-operator@example.com');
        $receiver = $this->createUser('approval-receiver@example.com');

        $fromAccount = $this->createAccountForUser($owner, ['balance' => 3000]);
        $toAccount = $this->createAccountForUser($receiver, ['balance' => 100]);

        AccountMember::query()->create([
            'account_id' => $fromAccount->id,
            'user_id' => $operator->id,
            'member_role' => 'operator',
            'daily_limit' => 5000,
        ]);

        Sanctum::actingAs($operator);

        $response = $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 1500,
            'fee' => 0,
            'category' => 'transfer',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Transaction pending approval')
            ->assertJsonPath('transaction.status', 'pending')
            ->assertJsonPath('transaction.approval.status', 'pending');

        $transactionId = (int) $response->json('transaction.id');

        $this->assertDatabaseHas('transfer_approvals', [
            'transaction_id' => $transactionId,
            'required_approvals' => 1,
            'current_approvals' => 0,
            'status' => 'pending',
        ]);

        $this->assertSame('3000.00', $fromAccount->fresh()->balance);
        $this->assertSame('100.00', $toAccount->fresh()->balance);
    }

    public function test_approver_can_approve_pending_transfer_and_execute_balances(): void
    {
        $owner = $this->createUser('approve-owner@example.com');
        $operator = $this->createUser('approve-operator@example.com');
        $approver = $this->createUser('approve-approver@example.com');
        $receiver = $this->createUser('approve-receiver@example.com');

        $fromAccount = $this->createAccountForUser($owner, ['balance' => 4000]);
        $toAccount = $this->createAccountForUser($receiver, ['balance' => 100]);

        AccountMember::query()->create([
            'account_id' => $fromAccount->id,
            'user_id' => $operator->id,
            'member_role' => 'operator',
            'daily_limit' => 5000,
        ]);

        AccountMember::query()->create([
            'account_id' => $fromAccount->id,
            'user_id' => $approver->id,
            'member_role' => 'approver',
            'daily_limit' => null,
        ]);

        Sanctum::actingAs($operator);

        $createResponse = $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 1200,
            'fee' => 0,
            'category' => 'transfer',
        ]);

        $transactionId = (int) $createResponse->json('transaction.id');

        Sanctum::actingAs($approver);

        $this->postJson('/api/transactions/'.$transactionId.'/approve')
            ->assertOk()
            ->assertJsonPath('message', 'Transaction approved and executed')
            ->assertJsonPath('transaction.status', 'completed')
            ->assertJsonPath('transaction.approval.status', 'approved');

        $this->assertSame('2770.00', $fromAccount->fresh()->balance);
        $this->assertSame('1300.00', $toAccount->fresh()->balance);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $approver->id,
            'event_type' => 'transaction.approved',
            'resource_id' => $transactionId,
        ]);
    }

    public function test_non_approver_cannot_approve_pending_transfer(): void
    {
        $owner = $this->createUser('approve-owner-2@example.com');
        $operator = $this->createUser('approve-operator-2@example.com');
        $receiver = $this->createUser('approve-receiver-2@example.com');
        $outsider = $this->createUser('approve-outsider@example.com');

        $fromAccount = $this->createAccountForUser($owner, ['balance' => 4000]);
        $toAccount = $this->createAccountForUser($receiver, ['balance' => 100]);

        AccountMember::query()->create([
            'account_id' => $fromAccount->id,
            'user_id' => $operator->id,
            'member_role' => 'operator',
            'daily_limit' => 5000,
        ]);

        Sanctum::actingAs($operator);

        $createResponse = $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 1300,
            'fee' => 0,
            'category' => 'transfer',
        ]);

        $transactionId = (int) $createResponse->json('transaction.id');

        Sanctum::actingAs($outsider);

        $this->postJson('/api/transactions/'.$transactionId.'/approve')
            ->assertForbidden();

        $this->assertDatabaseHas('transactions', [
            'id' => $transactionId,
            'status' => 'pending',
        ]);
    }

    public function test_approver_can_reject_pending_transfer_without_balance_change(): void
    {
        $owner = $this->createUser('reject-owner@example.com');
        $operator = $this->createUser('reject-operator@example.com');
        $approver = $this->createUser('reject-approver@example.com');
        $receiver = $this->createUser('reject-receiver@example.com');

        $fromAccount = $this->createAccountForUser($owner, ['balance' => 5000]);
        $toAccount = $this->createAccountForUser($receiver, ['balance' => 100]);

        AccountMember::query()->create([
            'account_id' => $fromAccount->id,
            'user_id' => $operator->id,
            'member_role' => 'operator',
            'daily_limit' => 5000,
        ]);

        AccountMember::query()->create([
            'account_id' => $fromAccount->id,
            'user_id' => $approver->id,
            'member_role' => 'approver',
            'daily_limit' => null,
        ]);

        Sanctum::actingAs($operator);

        $createResponse = $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 1400,
            'fee' => 0,
            'category' => 'transfer',
        ]);

        $transactionId = (int) $createResponse->json('transaction.id');

        Sanctum::actingAs($approver);

        $this->postJson('/api/transactions/'.$transactionId.'/reject')
            ->assertOk()
            ->assertJsonPath('message', 'Transaction rejected')
            ->assertJsonPath('transaction.status', 'rejected')
            ->assertJsonPath('transaction.approval.status', 'rejected');

        $this->assertSame('5000.00', $fromAccount->fresh()->balance);
        $this->assertSame('100.00', $toAccount->fresh()->balance);
    }

    public function test_user_can_list_transfer_recipients_across_app_accounts(): void
    {
        $sender = $this->createUser('recipient-sender@example.com');
        $receiver = $this->createUser('recipient-receiver@example.com');
        $third = $this->createUser('recipient-third@example.com');

        $senderAccount = $this->createAccountForUser($sender, ['name' => 'Sender Account']);
        $receiverAccount = $this->createAccountForUser($receiver, ['name' => 'Receiver Account']);
        $closedAccount = $this->createAccountForUser($third, [
            'name' => 'Closed Account',
            'status' => 'closed',
        ]);

        Sanctum::actingAs($sender);

        $response = $this->getJson('/api/transactions/recipients')
            ->assertOk();

        $response
            ->assertJsonFragment([
                'id' => $senderAccount->id,
                'name' => 'Sender Account',
                'is_accessible' => true,
            ])
            ->assertJsonFragment([
                'id' => $receiverAccount->id,
                'name' => 'Receiver Account',
                'is_accessible' => false,
            ]);

        $recipientIds = collect($response->json('recipients'))->pluck('id')->all();
        $this->assertNotContains($closedAccount->id, $recipientIds);
    }

    public function test_admin_cannot_initiate_transfer_from_pending_user_owned_account(): void
    {
        $adminRole = Role::query()->firstOrCreate(
            ['code' => 'admin'],
            ['name_lv' => 'Administrators']
        );

        $admin = User::query()->create([
            'role_id' => $adminRole->id,
            'name' => 'Admin Initiator',
            'email' => 'admin-pending-source@example.com',
            'password' => 'Password123!',
            'status' => 'active',
            'address' => 'Admin iela 1',
            'phone' => '+37120000000',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1001',
        ]);

        $pendingOwner = $this->createUser('pending-owner-source@example.com');
        $pendingOwner->update(['status' => 'pending']);
        $receiver = $this->createUser('active-receiver-source@example.com');

        $fromAccount = $this->createAccountForUser($pendingOwner, ['balance' => 500]);
        $toAccount = $this->createAccountForUser($receiver, ['balance' => 0]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/transactions', [
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'amount' => 10,
            'category' => 'transfer',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'No pending or blocked user-owned accounts can be used as transfer source');
    }

    private function createUser(string $email): User
    {
        $role = Role::query()->firstOrCreate(
            ['code' => 'user'],
            ['name_lv' => 'Lietotajs']
        );

        return User::query()->create([
            'role_id' => $role->id,
            'name' => explode('@', $email)[0],
            'email' => $email,
            'password' => 'Password123!',
            'address' => 'Testa iela 1',
            'phone' => '+37120000000',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1001',
            'status' => 'active',
        ]);
    }

    private function createAccountForUser(User $owner, array $overrides = []): Account
    {
        $account = Account::query()->create(array_merge([
            'owner_user_id' => $owner->id,
            'iban' => $this->nextIban(),
            'name' => 'Account '.$owner->id,
            'currency' => 'EUR',
            'balance' => 0,
            'type' => 'personal',
            'status' => 'active',
        ], $overrides));

        AccountMember::query()->create([
            'account_id' => $account->id,
            'user_id' => $owner->id,
            'member_role' => 'owner',
        ]);

        return $account;
    }

    private function nextIban(): string
    {
        $this->ibanSequence++;

        return 'LV00TEST'.str_pad((string) $this->ibanSequence, 10, '0', STR_PAD_LEFT);
    }
}
