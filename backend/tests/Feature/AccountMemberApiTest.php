<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountMember;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountMemberApiTest extends TestCase
{
    use RefreshDatabase;

    private int $ibanSequence = 2000000000;

    public function test_owner_can_add_update_list_and_remove_account_member(): void
    {
        $owner = $this->createUser('member-owner@example.com');
        $memberUser = $this->createUser('member-operator@example.com');

        $account = $this->createAccountForUser($owner, [
            'name' => 'Family Account',
        ]);

        Sanctum::actingAs($owner);

        $addResponse = $this->postJson('/api/accounts/'.$account->id.'/members', [
            'user_id' => $memberUser->id,
            'member_role' => 'operator',
            'daily_limit' => 150,
        ]);

        $addResponse->assertCreated()
            ->assertJsonPath('message', 'Account member added')
            ->assertJsonPath('member.user_id', $memberUser->id)
            ->assertJsonPath('member.member_role', 'operator');

        $memberId = (int) $addResponse->json('member.id');

        $this->getJson('/api/accounts/'.$account->id.'/members')
            ->assertOk()
            ->assertJsonCount(2, 'members');

        $this->patchJson('/api/accounts/'.$account->id.'/members/'.$memberId, [
            'member_role' => 'approver',
            'daily_limit' => 90,
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Account member updated')
            ->assertJsonPath('member.member_role', 'approver')
            ->assertJsonPath('member.daily_limit', '90.00');

        $this->deleteJson('/api/accounts/'.$account->id.'/members/'.$memberId)
            ->assertOk()
            ->assertJsonPath('message', 'Account member removed');

        $this->assertDatabaseMissing('account_members', [
            'id' => $memberId,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $owner->id,
            'event_type' => 'account.member_added',
            'resource_id' => $memberId,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $owner->id,
            'event_type' => 'account.member_updated',
            'resource_id' => $memberId,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $owner->id,
            'event_type' => 'account.member_removed',
            'resource_id' => $memberId,
        ]);
    }

    public function test_non_owner_member_cannot_manage_account_members(): void
    {
        $owner = $this->createUser('owner-no-rights@example.com');
        $existingMember = $this->createUser('existing-member@example.com');
        $targetUser = $this->createUser('target-member@example.com');

        $account = $this->createAccountForUser($owner);

        $member = AccountMember::query()->create([
            'account_id' => $account->id,
            'user_id' => $existingMember->id,
            'member_role' => 'operator',
            'daily_limit' => 50,
        ]);

        Sanctum::actingAs($existingMember);

        $this->postJson('/api/accounts/'.$account->id.'/members', [
            'user_id' => $targetUser->id,
            'member_role' => 'viewer',
        ])->assertForbidden();

        $this->patchJson('/api/accounts/'.$account->id.'/members/'.$member->id, [
            'member_role' => 'approver',
        ])->assertForbidden();

        $this->deleteJson('/api/accounts/'.$account->id.'/members/'.$member->id)
            ->assertForbidden();
    }

    public function test_owner_can_search_member_candidates_excluding_existing_members_and_owner(): void
    {
        $owner = $this->createUser('owner-search@example.com');
        $existingMember = $this->createUser('existing-search@example.com');
        $eligible = $this->createUser('eligible.member@example.com');
        $inactive = $this->createUser('inactive.member@example.com');

        $inactive->update(['status' => 'blocked']);

        $account = $this->createAccountForUser($owner, ['name' => 'Search Account']);

        AccountMember::query()->create([
            'account_id' => $account->id,
            'user_id' => $existingMember->id,
            'member_role' => 'viewer',
            'daily_limit' => null,
        ]);

        Sanctum::actingAs($owner);

        $this->getJson('/api/accounts/'.$account->id.'/members/candidates?q=member&limit=20')
            ->assertOk()
            ->assertJsonCount(1, 'candidates')
            ->assertJsonPath('candidates.0.id', $eligible->id)
            ->assertJsonPath('candidates.0.email', 'eligible.member@example.com');

        $this->getJson('/api/accounts/'.$account->id.'/members/candidates?q=member&include_inactive=1&limit=20')
            ->assertOk()
            ->assertJsonFragment(['id' => $eligible->id])
            ->assertJsonFragment(['id' => $inactive->id]);
    }

    public function test_non_owner_member_cannot_search_member_candidates(): void
    {
        $owner = $this->createUser('owner-search-denied@example.com');
        $member = $this->createUser('member-search-denied@example.com');

        $account = $this->createAccountForUser($owner);

        AccountMember::query()->create([
            'account_id' => $account->id,
            'user_id' => $member->id,
            'member_role' => 'viewer',
        ]);

        Sanctum::actingAs($member);

        $this->getJson('/api/accounts/'.$account->id.'/members/candidates?q=owner')
            ->assertForbidden();
    }

    public function test_incomplete_users_are_hidden_from_candidates_and_cannot_be_added(): void
    {
        $owner = $this->createUser('owner-complete@example.com');
        $incomplete = $this->createIncompleteUser('incomplete-member@example.com');

        $account = $this->createAccountForUser($owner);

        Sanctum::actingAs($owner);

        $this->getJson('/api/accounts/'.$account->id.'/members/candidates?q=incomplete')
            ->assertOk()
            ->assertJsonMissing(['id' => $incomplete->id]);

        $this->postJson('/api/accounts/'.$account->id.'/members', [
            'user_id' => $incomplete->id,
            'member_role' => 'viewer',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Lietotājam nav pabeigts profils vai konts nav aktīvs');
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

    private function createIncompleteUser(string $email): User
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
            'status' => 'active',
        ]);
    }

    private function createAccountForUser(User $owner, array $overrides = []): Account
    {
        $account = Account::query()->create(array_merge([
            'owner_user_id' => $owner->id,
            'iban' => $this->nextIban(),
            'name' => 'Member Account '.$owner->id,
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

        return 'LV00MEMB'.str_pad((string) $this->ibanSequence, 10, '0', STR_PAD_LEFT);
    }
}
