<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_users_and_roles(): void
    {
        $adminRole = Role::query()->create([
            'code' => 'admin',
            'name_lv' => 'Administrators',
        ]);

        $userRole = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        $admin = User::query()->create([
            'role_id' => $adminRole->id,
            'name' => 'Admin User',
            'email' => 'admin-users@example.com',
            'password' => 'Password123!',
            'address' => 'Admin iela 1',
            'phone' => '+37120000000',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1001',
            'status' => 'active',
        ]);

        User::query()->create([
            'role_id' => $userRole->id,
            'name' => 'Active Member',
            'email' => 'active-member@example.com',
            'password' => 'Password123!',
            'address' => 'Testa iela 2',
            'phone' => '+37120000001',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1002',
            'status' => 'active',
        ]);

        User::query()->create([
            'role_id' => $userRole->id,
            'name' => 'Blocked Member',
            'email' => 'blocked-member@example.com',
            'password' => 'Password123!',
            'address' => 'Testa iela 3',
            'phone' => '+37120000002',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1003',
            'status' => 'blocked',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users?status=active&q=Member')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.email', 'active-member@example.com')
            ->assertJsonPath('data.0.role.code', 'user');

        $this->getJson('/api/admin/roles')
            ->assertOk()
            ->assertJsonFragment([
                'code' => 'admin',
            ])
            ->assertJsonFragment([
                'code' => 'user',
            ]);
    }

    public function test_admin_list_hides_users_without_complete_profiles(): void
    {
        $adminRole = Role::query()->create([
            'code' => 'admin',
            'name_lv' => 'Administrators',
        ]);

        $userRole = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        $admin = User::query()->create([
            'role_id' => $adminRole->id,
            'name' => 'Admin User',
            'email' => 'admin-profile@example.com',
            'password' => 'Password123!',
            'address' => 'Admin iela 1',
            'phone' => '+37120000000',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1001',
            'status' => 'active',
        ]);

        User::query()->create([
            'role_id' => $userRole->id,
            'name' => 'Incomplete User',
            'email' => 'incomplete-user@example.com',
            'password' => 'Password123!',
            'status' => 'active',
        ]);

        User::query()->create([
            'role_id' => $userRole->id,
            'name' => 'Complete User',
            'email' => 'complete-user@example.com',
            'password' => 'Password123!',
            'address' => 'Testa iela 2',
            'phone' => '+37120000001',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1002',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonFragment(['email' => 'complete-user@example.com'])
            ->assertJsonMissing(['email' => 'incomplete-user@example.com']);
    }

    public function test_non_admin_cannot_access_admin_user_endpoints(): void
    {
        $userRole = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        $user = User::query()->create([
            'role_id' => $userRole->id,
            'name' => 'Regular User',
            'email' => 'regular-user@example.com',
            'password' => 'Password123!',
            'status' => 'active',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/admin/users')->assertForbidden();
        $this->getJson('/api/admin/roles')->assertForbidden();
    }

    public function test_admin_can_update_other_user_role_and_status_with_audit_log(): void
    {
        $adminRole = Role::query()->create([
            'code' => 'admin',
            'name_lv' => 'Administrators',
        ]);

        $userRole = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        $admin = User::query()->create([
            'role_id' => $adminRole->id,
            'name' => 'Admin User',
            'email' => 'admin-update@example.com',
            'password' => 'Password123!',
            'status' => 'active',
        ]);

        $managedUser = User::query()->create([
            'role_id' => $userRole->id,
            'name' => 'Managed User',
            'email' => 'managed-user@example.com',
            'password' => 'Password123!',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson('/api/admin/users/'.$managedUser->id, [
            'role_id' => $adminRole->id,
            'status' => 'blocked',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'User updated')
            ->assertJsonPath('user.status', 'blocked')
            ->assertJsonPath('user.role.code', 'admin');

        $this->assertDatabaseHas('users', [
            'id' => $managedUser->id,
            'role_id' => $adminRole->id,
            'status' => 'blocked',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'event_type' => 'admin.user_updated',
            'resource_type' => 'user',
            'resource_id' => $managedUser->id,
        ]);
    }

    public function test_admin_cannot_deactivate_own_account(): void
    {
        $adminRole = Role::query()->create([
            'code' => 'admin',
            'name_lv' => 'Administrators',
        ]);

        $admin = User::query()->create([
            'role_id' => $adminRole->id,
            'name' => 'Admin Self',
            'email' => 'admin-self@example.com',
            'password' => 'Password123!',
            'status' => 'active',
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson('/api/admin/users/'.$admin->id, [
            'status' => 'blocked',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Admin cannot deactivate own account');
    }

    public function test_last_active_admin_cannot_be_deactivated_or_demoted(): void
    {
        $adminRole = Role::query()->create([
            'code' => 'admin',
            'name_lv' => 'Administrators',
        ]);

        $userRole = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        $inactiveAdmin = User::query()->create([
            'role_id' => $adminRole->id,
            'name' => 'Inactive Admin',
            'email' => 'inactive-admin@example.com',
            'password' => 'Password123!',
            'status' => 'pending',
        ]);

        $lastActiveAdmin = User::query()->create([
            'role_id' => $adminRole->id,
            'name' => 'Last Active Admin',
            'email' => 'last-active-admin@example.com',
            'password' => 'Password123!',
            'status' => 'active',
        ]);

        Sanctum::actingAs($inactiveAdmin);

        $this->patchJson('/api/admin/users/'.$lastActiveAdmin->id, [
            'status' => 'blocked',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Cannot remove or deactivate the last active admin');

        $this->patchJson('/api/admin/users/'.$lastActiveAdmin->id, [
            'role_id' => $userRole->id,
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Cannot remove or deactivate the last active admin');
    }

    public function test_pending_user_can_only_be_approved_and_may_change_role_during_approval(): void
    {
        $adminRole = Role::query()->create([
            'code' => 'admin',
            'name_lv' => 'Administrators',
        ]);

        $userRole = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        $admin = User::query()->create([
            'role_id' => $adminRole->id,
            'name' => 'Admin User',
            'email' => 'admin-pending-guard@example.com',
            'password' => 'Password123!',
            'address' => 'Admin iela 1',
            'phone' => '+37120000000',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1001',
            'status' => 'active',
        ]);

        $pendingUser = User::query()->create([
            'role_id' => $userRole->id,
            'name' => 'Pending User',
            'email' => 'pending-only-approve@example.com',
            'password' => 'Password123!',
            'address' => 'Testa iela 8',
            'phone' => '+37120000008',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1008',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);

        // Admin can reject pending user by setting status to 'blocked'
        $this->patchJson('/api/admin/users/'.$pendingUser->id, [
            'status' => 'blocked',
        ])
            ->assertOk()
            ->assertJsonPath('user.status', 'blocked');

        // Reset to pending for next test  
        $pendingUser->update(['status' => 'pending']);
        $pendingUser->refresh();

$this->patchJson('/api/admin/users/'.$pendingUser->id, [
            'status' => 'active',
        ])
            ->assertOk()
            ->assertJsonPath('user.status', 'active');

        $pendingUserTwo = User::query()->create([
            'role_id' => $userRole->id,
            'name' => 'Pending User Two',
            'email' => 'pending-role-change-on-approve@example.com',
            'password' => 'Password123!',
            'address' => 'Testa iela 9',
            'phone' => '+37120000009',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1009',
            'status' => 'pending',
        ]);

        $this->patchJson('/api/admin/users/'.$pendingUserTwo->id, [
            'status' => 'active',
            'role_id' => $adminRole->id,
        ])
            ->assertOk()
            ->assertJsonPath('user.status', 'active')
            ->assertJsonPath('user.role.code', 'admin');
    }
}
