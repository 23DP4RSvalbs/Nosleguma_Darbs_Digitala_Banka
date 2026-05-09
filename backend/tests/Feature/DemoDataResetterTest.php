<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountMember;
use App\Models\BankNotification;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\TransferApproval;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DemoDataResetterTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_refresh_keeps_only_allowlisted_users_and_seeds_demo_data(): void
    {
        $role = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Old User',
            'email' => 'old@example.com',
            'password' => 'Password123!',
            'status' => 'blocked',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        Artisan::call('demo:refresh');

        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseMissing('users', ['email' => 'old@example.com']);

        $tests1 = User::query()->where('email', 'tests1@tests.com')->firstOrFail();
        $tests2 = User::query()->where('email', 'tests2@tests.com')->firstOrFail();

        $this->assertTrue(Hash::check('Parole123', $tests1->password));
        $this->assertTrue(Hash::check('Parole123', $tests2->password));
        $this->assertSame('admin', $tests1->role?->code);
        $this->assertSame('user', $tests2->role?->code);
        $this->assertNull($tests1->profile_picture);
        $this->assertNull($tests2->profile_picture);
        $this->assertTrue((bool) $tests1->two_factor_enabled);
        $this->assertTrue((bool) $tests2->two_factor_enabled);

        $this->assertDatabaseCount('accounts', 5);
        $this->assertDatabaseCount('account_members', 10);
        $this->assertDatabaseCount('transactions', 5);
        $this->assertDatabaseCount('transfer_approvals', 5);
        $this->assertDatabaseCount('bank_notifications', 6);

        $this->assertSame('owner', AccountMember::query()->whereHas('account', fn ($query) => $query->where('iban', 'LV88BANK1000000001'))->whereHas('user', fn ($query) => $query->where('email', 'tests1@tests.com'))->value('member_role'));
        $this->assertSame('operator', AccountMember::query()->whereHas('account', fn ($query) => $query->where('iban', 'LV88BANK1000000001'))->whereHas('user', fn ($query) => $query->where('email', 'tests2@tests.com'))->value('member_role'));
        $this->assertSame('approver', AccountMember::query()->whereHas('account', fn ($query) => $query->where('iban', 'LV88BANK1000000002'))->whereHas('user', fn ($query) => $query->where('email', 'tests2@tests.com'))->value('member_role'));

        $this->assertSame('active', Account::query()->where('iban', 'LV88BANK1000000001')->value('status'));
        $this->assertSame('frozen', Account::query()->where('iban', 'LV88BANK2000000002')->value('status'));
        $this->assertSame('closed', Account::query()->where('iban', 'LV88BANK1000000003')->value('status'));

        $this->assertSame('completed', Transaction::query()->where('reference', 'DEMO-TRX-0001')->value('status'));
        $this->assertSame('pending', Transaction::query()->where('reference', 'DEMO-TRX-0002')->value('status'));
        $this->assertSame('approved', TransferApproval::query()->whereHas('transaction', fn ($query) => $query->where('reference', 'DEMO-TRX-0001'))->value('status'));
        $this->assertSame('pending', TransferApproval::query()->whereHas('transaction', fn ($query) => $query->where('reference', 'DEMO-TRX-0002'))->value('status'));

        $this->assertSame('transaction', BankNotification::query()->where('title', 'Outgoing transfer completed')->value('type'));
    }
}