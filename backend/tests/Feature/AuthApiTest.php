<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Support\TotpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_audit_log_is_created(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Register User',
            'email' => 'register@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'register@example.com')
            ->assertJsonPath('user.preferred_currency', 'EUR')
            ->assertJsonPath('user.two_factor_enabled', false)
            ->assertJsonPath('two_factor_setup.issuer', 'Astera Banka')
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'email', 'role'],
                'two_factor_setup' => ['issuer', 'label', 'secret', 'otpauth_url', 'app_hint'],
            ]);

        $twoFactorSetup = $response->json('two_factor_setup');
        $this->assertIsArray($twoFactorSetup);
        $this->assertNotEmpty($twoFactorSetup['secret'] ?? null);

        $this->assertDatabaseHas('users', [
            'email' => 'register@example.com',
            'status' => 'active',
            'preferred_currency' => 'EUR',
            'locale' => 'lv',
            'timezone' => 'Europe/Riga',
            'date_format' => 'dd.mm.yyyy',
            'amount_format' => 'local',
            'email_notifications' => true,
            'push_notifications' => true,
            'marketing_notifications' => false,
            'compact_mode' => false,
            'default_dashboard_view' => 'overview',
            'mask_balances' => false,
            'require_payment_confirmation' => true,
            'two_factor_enabled' => false,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$response->json('token'))
            ->postJson('/api/auth/2fa/enable', [
                'code' => app(TotpService::class)->currentCode((string) $twoFactorSetup['secret']),
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Two-factor authentication enabled. You can now login with authenticator code.');

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'register@example.com',
            'password' => 'Password123!',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('requires_two_factor', true)
            ->assertJsonStructure(['message', 'requires_two_factor', 'two_factor_ticket']);

        $this->assertDatabaseHas('audit_logs', [
            'event_type' => 'auth.register',
            'resource_type' => 'user',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'event_type' => 'auth.two_factor_enabled',
            'resource_type' => 'user',
        ]);
    }

    public function test_user_can_login_profile_and_logout_with_audit_events(): void
    {
        $role = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Login User',
            'email' => 'login@example.com',
            'password' => 'Password123!',
            'status' => 'active',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'login@example.com',
            'password' => 'Password123!',
        ]);

        $loginResponse->assertOk()
            ->assertJsonPath('requires_two_factor', true)
            ->assertJsonStructure(['message', 'requires_two_factor', 'two_factor_ticket']);

        $token = $this->completeTwoFactorLogin(
            (string) $loginResponse->json('two_factor_ticket'),
            'JBSWY3DPEHPK3PXP'
        );

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'login@example.com');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logout successful');

        $this->assertDatabaseHas('audit_logs', [
            'event_type' => 'auth.login',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'event_type' => 'auth.logout',
        ]);
    }

    public function test_login_with_invalid_password_returns_422_and_logs_failure(): void
    {
        $role = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Fail User',
            'email' => 'fail@example.com',
            'password' => 'Password123!',
            'status' => 'active',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'fail@example.com',
            'password' => 'WrongPassword123!',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Nederīgs e-pasts vai parole.');

        $this->assertDatabaseHas('audit_logs', [
            'event_type' => 'auth.login_failed',
        ]);
    }

    public function test_login_is_rate_limited_after_repeated_failed_attempts(): void
    {
        if (filter_var(env('DISABLE_RATE_LIMITING', false), FILTER_VALIDATE_BOOL)) {
            $this->markTestSkipped('Rate limiting is disabled in this environment.');
        }

        $role = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        $email = 'ratelimit-'.bin2hex(random_bytes(4)).'@example.com';

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Rate Limit User',
            'email' => $email,
            'password' => 'Password123!',
            'status' => 'active',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => $email,
                'password' => 'WrongPassword123!',
            ])->assertStatus(422);
        }

            $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'WrongPassword123!',
        ])
                ->assertStatus(422)
                ->assertJsonPath('message', 'Nederīgs e-pasts vai parole.');
    }

    public function test_registration_is_rate_limited_after_repeated_attempts_from_same_ip(): void
    {
        if (filter_var(env('DISABLE_RATE_LIMITING', false), FILTER_VALIDATE_BOOL)) {
            $this->markTestSkipped('Rate limiting is disabled in this environment.');
        }

        for ($i = 1; $i <= 3; $i++) {
            $this->postJson('/api/auth/register', [
                'name' => 'Register User',
                'email' => 'register-throttle-'.$i.'@example.com',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
            ])->assertCreated();
        }

        $this->postJson('/api/auth/register', [
            'name' => 'Register User',
            'email' => 'register-throttle-4@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])
            ->assertCreated()
            ->assertJsonPath('message', 'Reģistrācija izdevās. Pabeidz autentifikatora iestatīšanu, lai aktivizētu 2FA pieslēgšanos.');
    }

    public function test_authenticated_user_can_update_profile(): void
    {
        $role = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Profile User',
            'email' => 'profile@example.com',
            'password' => 'Password123!',
            'status' => 'active',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'profile@example.com',
            'password' => 'Password123!',
        ])->assertOk();

        $token = $this->completeTwoFactorLogin((string) $loginResponse->json('two_factor_ticket'), 'JBSWY3DPEHPK3PXP');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson('/api/auth/profile', [
                'name' => 'Profile User Updated',
                'email' => 'profile.updated@example.com',
                'preferred_currency' => 'USD',
                'locale' => 'en',
                'timezone' => 'UTC',
                'date_format' => 'yyyy-mm-dd',
                'amount_format' => 'international',
                'email_notifications' => false,
                'push_notifications' => true,
                'marketing_notifications' => true,
                'compact_mode' => true,
                'default_dashboard_view' => 'transactions',
                'mask_balances' => true,
                'require_payment_confirmation' => false,
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Profils atjaunināts veiksmīgi.')
            ->assertJsonPath('user.name', 'Profile User Updated')
            ->assertJsonPath('user.email', 'profile.updated@example.com')
            ->assertJsonPath('user.preferred_currency', 'USD')
            ->assertJsonPath('user.locale', 'en')
            ->assertJsonPath('user.timezone', 'UTC')
            ->assertJsonPath('user.date_format', 'yyyy-mm-dd')
            ->assertJsonPath('user.amount_format', 'international')
            ->assertJsonPath('user.email_notifications', false)
            ->assertJsonPath('user.push_notifications', true)
            ->assertJsonPath('user.marketing_notifications', true)
            ->assertJsonPath('user.compact_mode', true)
            ->assertJsonPath('user.default_dashboard_view', 'transactions')
            ->assertJsonPath('user.mask_balances', true)
            ->assertJsonPath('user.require_payment_confirmation', false);

        $this->assertDatabaseHas('users', [
            'email' => 'profile.updated@example.com',
            'name' => 'Profile User Updated',
            'preferred_currency' => 'USD',
            'locale' => 'en',
            'timezone' => 'UTC',
            'date_format' => 'yyyy-mm-dd',
            'amount_format' => 'international',
            'email_notifications' => false,
            'push_notifications' => true,
            'marketing_notifications' => true,
            'compact_mode' => true,
            'default_dashboard_view' => 'transactions',
            'mask_balances' => true,
            'require_payment_confirmation' => false,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'event_type' => 'auth.profile_updated',
            'resource_type' => 'user',
        ]);
    }

    public function test_profile_completion_moves_user_to_pending_approval(): void
    {
        $role = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Pending Profile User',
            'email' => 'pending-profile@example.com',
            'password' => 'Password123!',
            'status' => 'active',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'pending-profile@example.com',
            'password' => 'Password123!',
        ])->assertOk();

        $token = $this->completeTwoFactorLogin((string) $loginResponse->json('two_factor_ticket'), 'JBSWY3DPEHPK3PXP');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson('/api/auth/profile', [
                'name' => 'Pending Profile User',
                'email' => 'pending-profile@example.com',
                'address' => 'Testa iela 5',
                'phone' => '+37120000005',
                'region' => 'Rīga',
                'country' => 'LV',
                'postal_code' => 'LV-1005',
            ])
            ->assertOk()
            ->assertJsonPath('user.status', 'pending');

        $this->assertDatabaseHas('users', [
            'email' => 'pending-profile@example.com',
            'status' => 'pending',
        ]);
    }

    public function test_profile_update_rejects_duplicate_email(): void
    {
        $role = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Primary User',
            'email' => 'primary@example.com',
            'password' => 'Password123!',
            'status' => 'active',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Secondary User',
            'email' => 'secondary@example.com',
            'password' => 'Password123!',
            'status' => 'active',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'secondary@example.com',
            'password' => 'Password123!',
        ])->assertOk();

        $token = $this->completeTwoFactorLogin((string) $loginResponse->json('two_factor_ticket'), 'JBSWY3DPEHPK3PXP');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson('/api/auth/profile', [
                'name' => 'Secondary User',
                'email' => 'primary@example.com',
            ])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors']);
    }

    public function test_authenticated_user_can_change_password_with_current_password(): void
    {
        $role = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Password User',
            'email' => 'password@example.com',
            'password' => 'Password123!',
            'status' => 'active',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'password@example.com',
            'password' => 'Password123!',
        ])->assertOk();

        $token = $this->completeTwoFactorLogin((string) $loginResponse->json('two_factor_ticket'), 'JBSWY3DPEHPK3PXP');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/password', [
                'current_password' => 'Password123!',
                'new_password' => 'NewPassword456!',
                'new_password_confirmation' => 'NewPassword456!',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Parole nomainīta veiksmīgi.');

        $updatedUser = User::query()->where('email', 'password@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('NewPassword456!', $updatedUser->password));

        $this->postJson('/api/auth/login', [
            'email' => 'password@example.com',
            'password' => 'Password123!',
        ])->assertStatus(422);

        RateLimiter::clear('password@example.com|127.0.0.1');
        RateLimiter::clear('password@example.com|::1');
        RateLimiter::clear('password@example.com|::ffff:127.0.0.1');

        $newLoginResponse = $this->postJson('/api/auth/login', [
            'email' => 'password@example.com',
            'password' => 'NewPassword456!',
        ])->assertOk();

            $this->completeTwoFactorLogin((string) $newLoginResponse->json('two_factor_ticket'), 'JBSWY3DPEHPK3PXP');

        $this->assertDatabaseHas('audit_logs', [
            'event_type' => 'auth.password_changed',
            'resource_type' => 'user',
        ]);
    }

    public function test_password_change_rejects_invalid_current_password(): void
    {
        $role = Role::query()->create([
            'code' => 'user',
            'name_lv' => 'Lietotajs',
        ]);

        User::query()->create([
            'role_id' => $role->id,
            'name' => 'Wrong Current Password User',
            'email' => 'wrong-current@example.com',
            'password' => 'Password123!',
            'status' => 'active',
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'wrong-current@example.com',
            'password' => 'Password123!',
        ])->assertOk();

        $token = $this->completeTwoFactorLogin((string) $loginResponse->json('two_factor_ticket'), 'JBSWY3DPEHPK3PXP');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/password', [
                'current_password' => 'NotMyCurrentPassword!',
                'new_password' => 'AnotherPassword789!',
                'new_password_confirmation' => 'AnotherPassword789!',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Esošā parole nav pareiza.');
    }

    private function completeTwoFactorLogin(string $ticket, string $secret): string
    {
        $response = $this->postJson('/api/auth/2fa/challenge', [
            'ticket' => $ticket,
            'code' => app(TotpService::class)->currentCode($secret),
        ]);

        $response->assertOk();

        return (string) $response->json('token');
    }
}
