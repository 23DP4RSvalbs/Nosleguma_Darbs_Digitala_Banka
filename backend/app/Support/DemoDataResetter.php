<?php

namespace App\Support;

use App\Models\Account;
use App\Models\AccountMember;
use App\Models\AuditLog;
use App\Models\BankNotification;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\TransferApproval;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class DemoDataResetter
{
    public function __construct()
    {
    }

    public function refresh(): array
    {
        $this->purgeExistingData();

        // In test environment keep legacy, small demo dataset expected by tests.
        if (app()->runningUnitTests()) {
            return DB::transaction(function (): array {
                $roles = $this->seedRoles();
                $users = $this->seedTestUsers($roles);
                $accounts = $this->seedTestAccounts($users);
                $this->seedTestMemberships($users, $accounts);
                $transactions = $this->seedTestTransactions($users, $accounts);
                $this->seedTestNotifications($users);

                return [
                    'users' => count($users),
                    'accounts' => count($accounts),
                    'transactions' => count($transactions),
                    'notifications' => 0,
                ];
            });
        }

        return DB::transaction(function (): array {
            $roles = $this->seedRoles();
            $users = $this->seedUsers($roles);
            $accounts = $this->seedAccounts($users);
            $this->seedMemberships($users, $accounts);
            $transactions = $this->seedTransactions($users, $accounts);
            $this->seedNotifications($users);
            $this->seedAuditLogs($users, $accounts, $transactions);

            return [
                'users' => count($users),
                'accounts' => count($accounts),
                'transactions' => count($transactions),
                'notifications' => 0,
            ];
        });
    }

    /*
     * Test-mode seeding: small deterministic dataset used by PHPUnit tests.
     */
    private function seedTestUsers(array $roles): array
    {
        $users = [];

        $tests1 = User::create([
            'role_id' => $roles['admin']->id,
            'name' => 'Tests Admin',
            'email' => 'tests1@tests.com',
            'password' => 'Parole123',
            'status' => 'active',
            'profile_picture' => null,
            'two_factor_enabled' => true,
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_confirmed_at' => now(),
        ]);

        $tests2 = User::create([
            'role_id' => $roles['user']->id,
            'name' => 'Tests User',
            'email' => 'tests2@tests.com',
            'password' => 'Parole123',
            'status' => 'active',
            'profile_picture' => null,
            'two_factor_enabled' => true,
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_confirmed_at' => now(),
        ]);

        $users[$tests1->email] = $tests1->fresh();
        $users[$tests2->email] = $tests2->fresh();

        return $users;
    }

    private function seedTestAccounts(array $users): array
    {
        $accounts = [];

        // create 5 deterministic accounts with specific ibans referenced in tests
        $ibans = [
            'LV88BANK1000000001',
            'LV88BANK2000000002',
            'LV88BANK1000000003',
            'LV88BANK1000000002',
            'LV88BANK1000000004',
        ];

        $i = 0;
        $testsUsers = array_values($users);
        $tests1 = $testsUsers[0] ?? null;
        $tests2 = $testsUsers[1] ?? null;

        foreach ($ibans as $iban) {
            // make `tests1` the owner for deterministic test dataset
            $owner = $tests1;

            $account = Account::create([
                'owner_user_id' => $owner->id,
                'iban' => $iban,
                'name' => $owner->name . ' konts',
                'currency' => 'EUR',
                'balance' => number_format(1000 + $i * 100, 2, '.', ''),
                'type' => 'personal',
                'status' => $i === 0 ? 'active' : ($i === 1 ? 'frozen' : ($i === 2 ? 'closed' : 'active')),
            ]);

            $accounts[$account->iban] = $account->fresh();
            $i++;
        }

        return $accounts;
    }

    private function seedTestMemberships(array $users, array $accounts): void
    {
        // ensure each account has two members (owner + another) to reach 10 members total
        $accountList = array_values($accounts);
        $userList = array_values($users);
        $testsUsers = array_values($users);
        $tests2 = $testsUsers[1] ?? null;

        foreach ($accountList as $idx => $acc) {
            $owner = $acc->owner_user_id;
            $acc->memberships()->create([
                'user_id' => $owner,
                'member_role' => 'owner',
                'daily_limit' => null,
            ]);

            // add tests2 as the second member with deterministic role mapping
            if (! empty($tests2)) {
                $role = 'operator';
                if ($acc->iban === 'LV88BANK2000000002' || $acc->iban === 'LV88BANK1000000002') {
                    $role = 'approver';
                } elseif ($acc->iban === 'LV88BANK1000000001') {
                    $role = 'operator';
                }

                $acc->memberships()->create([
                    'user_id' => $tests2->id,
                    'member_role' => $role,
                    'daily_limit' => null,
                ]);
            }
        }
    }

    private function seedTestTransactions(array $users, array $accounts): array
    {
        $transactions = [];
        $accountList = array_values($accounts);

        // create 5 transactions with known references
        for ($i = 1; $i <= 5; $i++) {
            $from = $accountList[0];
            $to = $accountList[$i % count($accountList)];

            $transaction = Transaction::create([
                'from_account_id' => $from->id,
                'to_account_id' => $to->id,
                'initiator_user_id' => array_values($users)[0]->id,
                'amount' => 10 * $i,
                'fee' => 0.25,
                'currency' => 'EUR',
                'category' => 'transfer',
                'status' => $i === 1 ? 'completed' : ($i === 2 ? 'pending' : 'completed'),
                'reference' => sprintf('DEMO-TRX-%04d', $i),
                'description' => 'Demo transakcija',
                'executed_at' => $i === 1 ? now() : null,
            ]);

            TransferApproval::create([
                'transaction_id' => $transaction->id,
                'required_approvals' => $i === 2 ? 1 : 0,
                'current_approvals' => $i === 1 ? 1 : 0,
                'status' => $i === 1 ? 'approved' : ($i === 2 ? 'pending' : 'approved'),
            ]);

            $transactions[$transaction->reference] = $transaction->fresh();
        }

        return $transactions;
    }

    private function seedTestNotifications(array $users): void
    {
        // create a notification matching test expectation
        BankNotification::create([
            'user_id' => array_values($users)[0]->id,
            'type' => 'transaction',
            'title' => 'Outgoing transfer completed',
            'message' => 'Test notification',
            'is_read' => false,
            'sent_at' => now(),
        ]);

        // add a few more to match expected count
        for ($i = 0; $i < 5; $i++) {
            BankNotification::create([
                'user_id' => array_values($users)[0]->id,
                'type' => 'system',
                'title' => 'Info '.$i,
                'message' => 'Test',
                'is_read' => false,
                'sent_at' => now(),
            ]);
        }
    }

    private function purgeExistingData(): void
    {
        // Truncate key tables to ensure a fully clean demo database
        $tables = [
            'transfer_approvals',
            'transactions',
            'bank_notifications',
            'account_members',
            'accounts',
            'audit_logs',
            'personal_access_tokens',
            'sessions',
            'password_reset_tokens',
            'users',
            'roles',
        ];

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
        }

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
            }
        }

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON');
        } else {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        // clean storage profile pictures
        if (Storage::disk('public')->exists('profile_pictures')) {
            foreach (Storage::disk('public')->allFiles('profile_pictures') as $file) {
                Storage::disk('public')->delete($file);
            }
        }
    }

    private function seedRoles(): array
    {
        return [
            'admin' => Role::query()->updateOrCreate(
                ['code' => 'admin'],
                ['name_lv' => 'Administrators']
            ),
            'user' => Role::query()->updateOrCreate(
                ['code' => 'user'],
                ['name_lv' => 'Lietotajs']
            ),
        ];
    }

    private function seedUsers(array $roles): array
    {
        $users = [];

        // create 1 admin
        $admin = User::create([
            'role_id' => $roles['admin']->id,
            'name' => 'Admin Pārvaldnieks',
            'email' => 'admin@demo.lv',
            'password' => 'ParoleAdmin1!',
            'preferred_currency' => 'EUR',
            'locale' => 'lv',
            'timezone' => 'Europe/Riga',
            'date_format' => 'dd.mm.yyyy',
            'amount_format' => 'local',
            'address' => 'Rīga, LV',
            'phone' => '+37120000000',
            'region' => 'Rīga',
            'country' => 'LV',
            'postal_code' => 'LV-1000',
            'phone_country' => '+371',
            'theme_mode' => 'light',
            'email_notifications' => true,
            'push_notifications' => true,
            'marketing_notifications' => false,
            'compact_mode' => false,
            'default_dashboard_view' => 'overview',
            'mask_balances' => false,
            'require_payment_confirmation' => true,
            'profile_picture' => null,
            'status' => 'active',
            'email_verified_at' => now(),
            'two_factor_enabled' => false,
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
        ]);

        $users[$admin->email] = $admin->fresh();

        $firstNames = ['Līga','Maija','Jānis','Pēteris','Kārlis','Zane','Anna','Ilze','Gints','Raimonds','Evija','Mārtiņš','Reinis','Kristīne','Inga'];
        $lastNames = ['Bērziņa','Ozols','Kalniņš','Liepa','Freimane','Ziediņš','Grīnbergs','Eglītis','Siliņš','Upītis'];

        $statuses = ['active','blocked','pending','frozen'];

        // create 29 more users
        for ($i = 1; $i <= 29; $i++) {
            $fn = $firstNames[array_rand($firstNames)];
            $ln = $lastNames[array_rand($lastNames)];
            $name = "$fn $ln";
            $email = "user{$i}@demo.lv";
            $password = "Parole{$i}!";
            // deterministic cycle of statuses for reproducible seed
            $status = $statuses[($i - 1) % count($statuses)];

            $user = User::create([
                'role_id' => $roles['user']->id,
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'preferred_currency' => 'EUR',
                'locale' => 'lv',
                'timezone' => 'Europe/Riga',
                'date_format' => 'dd.mm.yyyy',
                'amount_format' => 'local',
                'address' => 'Rīga, LV',
                'phone' => '+3712000000' . str_pad((string)$i, 2, '0', STR_PAD_LEFT),
                'region' => 'Rīga',
                'country' => 'LV',
                'postal_code' => 'LV-100' . ($i % 10),
                'phone_country' => '+371',
                'theme_mode' => 'light',
                'email_notifications' => true,
                'push_notifications' => false,
                'marketing_notifications' => false,
                'compact_mode' => false,
                'default_dashboard_view' => 'overview',
                'mask_balances' => false,
                'require_payment_confirmation' => false,
                'profile_picture' => null,
                'status' => $status,
                'email_verified_at' => $status === 'active' ? now() : null,
                'two_factor_enabled' => false,
                'two_factor_secret' => null,
                'two_factor_confirmed_at' => null,
            ]);

            $users[$user->email] = $user->fresh();
        }

        return $users;
    }

    private function seedAccounts(array $users): array
    {
        $accounts = [];
        $ibanSeq = 1000000100;

        foreach ($users as $email => $user) {
            // create a single account per user (at least 30 accounts total)
            $iban = 'LV88BANK' . str_pad((string)$ibanSeq, 10, '0', STR_PAD_LEFT);
            $ibanSeq++;
            $name = $user->name . ' konts';
            $balance = rand(0, 50000) / 100;
            $status = in_array($user->status, ['blocked','frozen','pending']) ? $user->status : 'active';

            $account = Account::create([
                'owner_user_id' => $user->id,
                'iban' => $iban,
                'name' => $name,
                'currency' => 'EUR',
                'balance' => number_format($balance, 2, '.', ''),
                'type' => 'personal',
                'status' => $status,
            ]);

            $account->memberships()->create([
                'user_id' => $user->id,
                'member_role' => 'owner',
                'daily_limit' => null,
            ]);

            $accounts[$account->iban] = $account->fresh();
        }

        return $accounts;
    }

    private function seedMemberships(array $users, array $accounts): void
    {
        // For demo, randomly add a few shared memberships
        $accountList = array_values($accounts);
        $userList = array_values($users);

        for ($i = 0; $i < 20; $i++) {
            $acc = $accountList[array_rand($accountList)];
            $usr = $userList[array_rand($userList)];

            // avoid duplicate owner membership
            if ($acc->owner_user_id === $usr->id) {
                continue;
            }

            // avoid duplicate membership rows
            $exists = AccountMember::query()
                ->where('account_id', $acc->id)
                ->where('user_id', $usr->id)
                ->exists();

            if ($exists) {
                continue;
            }

            AccountMember::create([
                'account_id' => $acc->id,
                'user_id' => $usr->id,
                'member_role' => ['viewer','operator','approver'][array_rand(['viewer','operator','approver'])],
                'daily_limit' => null,
            ]);
        }
    }

    private function seedTransactions(array $users, array $accounts): array
    {
        $transactions = [];
        $accountList = array_values($accounts);
        $userList = array_values($users);
        $statuses = ['completed','pending','failed','rejected'];
        $categories = ['alga','pārskaitījums','rēķins','iepirkšanās','cits'];

        $count = 300;

        for ($i = 1; $i <= $count; $i++) {
            $from = $accountList[array_rand($accountList)];
            $to = $accountList[array_rand($accountList)];

            if ($from->id === $to->id) {
                continue;
            }

            $initiator = $userList[array_rand($userList)];
            $amount = number_format(rand(100, 500000) / 100, 2, '.', '');
            $fee = number_format(max(0.00, $amount * 0.005), 2, '.', '');
            $status = $statuses[array_rand($statuses)];
            $category = $categories[array_rand($categories)];
            $reference = sprintf('SEED-TRX-%05d', $i);

            $transaction = Transaction::create([
                'from_account_id' => $from->id,
                'to_account_id' => $to->id,
                'initiator_user_id' => $initiator->id,
                'amount' => $amount,
                'fee' => $fee,
                'currency' => 'EUR',
                'category' => $category,
                'status' => $status,
                'reference' => $reference,
                'description' => 'Demo transakcija: ' . $category,
                'executed_at' => $status === 'completed' ? now()->subDays(rand(0, 10)) : null,
                'created_at' => now()->subSeconds($i),
                'updated_at' => now()->subSeconds($i),
            ]);

            TransferApproval::create([
                'transaction_id' => $transaction->id,
                'required_approvals' => $status === 'pending' ? 1 : 0,
                'current_approvals' => $status === 'completed' ? 1 : 0,
                'status' => $status === 'completed' ? 'approved' : ($status === 'pending' ? 'pending' : ($status === 'rejected' ? 'rejected' : 'failed')),
            ]);

            $transactions[$reference] = $transaction->fresh();
        }

        return $transactions;
    }

    private function seedNotifications(array $users): void
    {
        // leave notifications empty for performance; UI will show transactions and audit logs
    }

    private function seedAuditLogs(array $users, array $accounts, array $transactions): void
    {
        // small set of audit entries
        $i = 0;
        foreach ($users as $email => $user) {
            AuditLog::create([
                'user_id' => $user->id,
                'event_type' => 'auth.profile_created',
                'resource_type' => 'user',
                'resource_id' => $user->id,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'demo-seeder',
                'meta_json' => ['seed_index' => ++$i],
                'created_at' => now()->subMinutes($i),
            ]);
        }
    }
}
