<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountMember;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_filter_update_and_close_account(): void
    {
        $user = $this->createUser('accounts-owner@example.com');
        Sanctum::actingAs($user);

        $createResponse = $this->postJson('/api/accounts', [
            'name' => 'Main Wallet',
            'currency' => 'eur',
            'type' => 'personal',
        ]);

        $createResponse->assertCreated()
            ->assertJsonPath('message', 'Account created successfully')
            ->assertJsonPath('account.name', 'Main Wallet')
            ->assertJsonPath('account.currency', 'EUR');

        $accountId = (int) $createResponse->json('account.id');

        $this->assertDatabaseHas('accounts', [
            'id' => $accountId,
            'owner_user_id' => $user->id,
            'name' => 'Main Wallet',
            'status' => 'active',
        ]);

        $this->getJson('/api/accounts?status=active&type=personal&q=Main&sort_by=name&sort_dir=asc')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $accountId,
                'name' => 'Main Wallet',
            ]);

        $this->putJson('/api/accounts/'.$accountId, [
            'name' => 'Main Wallet Updated',
            'status' => 'frozen',
        ])
            ->assertOk()
            ->assertJsonPath('account.name', 'Main Wallet Updated')
            ->assertJsonPath('account.status', 'frozen');

        $this->deleteJson('/api/accounts/'.$accountId)
            ->assertOk()
            ->assertJsonPath('message', 'Account closed successfully');

        $this->assertDatabaseHas('accounts', [
            'id' => $accountId,
            'status' => 'closed',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event_type' => 'account.created',
            'resource_id' => $accountId,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event_type' => 'account.updated',
            'resource_id' => $accountId,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event_type' => 'account.closed',
            'resource_id' => $accountId,
        ]);
    }

    public function test_non_owner_cannot_update_or_close_account(): void
    {
        $owner = $this->createUser('account-owner@example.com');
        $otherUser = $this->createUser('account-other@example.com');

        $account = $this->createAccountForUser($owner, [
            'name' => 'Shared Vault',
            'status' => 'active',
        ]);

        Sanctum::actingAs($otherUser);

        $this->putJson('/api/accounts/'.$account->id, [
            'name' => 'Should Fail',
        ])->assertForbidden();

        $this->deleteJson('/api/accounts/'.$account->id)
            ->assertForbidden();
    }

    public function test_closed_account_cannot_be_reopened_via_status_update(): void
    {
        $owner = $this->createUser('closed-owner@example.com');
        Sanctum::actingAs($owner);

        $account = $this->createAccountForUser($owner, [
            'name' => 'Closed Vault',
            'status' => 'closed',
        ]);

        $this->putJson('/api/accounts/'.$account->id, [
            'status' => 'active',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Closed account status cannot be changed');

        $this->assertDatabaseHas('accounts', [
            'id' => $account->id,
            'status' => 'closed',
        ]);
    }

    public function test_user_without_complete_profile_cannot_create_account(): void
    {
        $role = Role::query()->firstOrCreate(
            ['code' => 'user'],
            ['name_lv' => 'Lietotajs']
        );

        $user = User::query()->create([
            'role_id' => $role->id,
            'name' => 'Incomplete User',
            'email' => 'incomplete-account@example.com',
            'password' => 'Password123!',
            'status' => 'active',
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/accounts', [
            'name' => 'Main Wallet',
            'currency' => 'eur',
            'type' => 'personal',
        ])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Aizpildi profila iestatījumus, lai turpinātu.');
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
            'iban' => sprintf('LV%02dTEST%010d', random_int(10, 99), random_int(0, 9999999999)),
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
}
