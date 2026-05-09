<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Role;
use App\Models\User;
use App\Support\TotpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    private const TICKET_TTL_SECONDS = 300;
    private const OTP_ISSUER = 'Astera Banka';
    private const STARTER_ACCOUNT_BALANCE = 1500;
    private const STARTER_ACCOUNT_CURRENCY = 'EUR';

    
    private const ALLOWED_CURRENCIES = ['EUR', 'USD', 'GBP', 'SEK', 'NOK'];
    private const ALLOWED_LOCALES = ['lv', 'en', 'sv'];
    private const ALLOWED_TIMEZONES = ['Europe/Riga', 'Europe/Stockholm', 'Europe/London', 'UTC'];
    private const ALLOWED_DATE_FORMATS = ['dd.mm.yyyy', 'yyyy-mm-dd', 'mm/dd/yyyy'];
    private const ALLOWED_AMOUNT_FORMATS = ['local', 'international'];
    private const ALLOWED_DASHBOARD_VIEWS = ['overview', 'accounts', 'transactions'];
    private const ALLOWED_THEME_MODES = ['light', 'dark'];
    private const PERSON_NAME_REGEX = '/^(?=.{1,20}$)[A-Za-zĀ-ž]+(?:\s+[A-Za-zĀ-ž]+)+\s*$/u';
    private const STRONG_PASSWORD_REGEX = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/';

    public function __construct(private readonly TotpService $totpService)
    {
    }

    
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => $this->personNameRules(),
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'preferred_currency' => ['nullable', 'string', Rule::in(self::ALLOWED_CURRENCIES)],
            'locale' => ['nullable', 'string', Rule::in(self::ALLOWED_LOCALES)],
            'timezone' => ['nullable', 'string', Rule::in(self::ALLOWED_TIMEZONES)],
            'date_format' => ['nullable', 'string', Rule::in(self::ALLOWED_DATE_FORMATS)],
            'amount_format' => ['nullable', 'string', Rule::in(self::ALLOWED_AMOUNT_FORMATS)],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'region' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'size:2'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'phone_country' => ['nullable', 'string', 'max:8'],
            'theme_mode' => ['nullable', 'string', Rule::in(self::ALLOWED_THEME_MODES)],
            'email_notifications' => ['nullable', 'boolean'],
            'push_notifications' => ['nullable', 'boolean'],
            'marketing_notifications' => ['nullable', 'boolean'],
            'compact_mode' => ['nullable', 'boolean'],
            'default_dashboard_view' => ['nullable', 'string', Rule::in(self::ALLOWED_DASHBOARD_VIEWS)],
            'mask_balances' => ['nullable', 'boolean'],
            'require_payment_confirmation' => ['nullable', 'boolean'],
            'password' => $this->strongPasswordRules(),
        ], [
            'name.regex' => 'Ievadi divus vārdus, izmantojot tikai burtus un atstarpi. Maksimums 20 simboli.',
            'password.regex' => 'Parolei jābūt vismaz 8 simbolus garai, ar vienu lielo burtu, vienu mazo burtu un vienu ciparu.',
        ]);

        $userRole = Role::query()->firstOrCreate(
            ['code' => 'user'],
            ['name_lv' => 'Lietotajs']
        );

        $user = User::query()->create($this->filterUserColumns([
            'role_id' => $userRole->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'preferred_currency' => $validated['preferred_currency'] ?? 'EUR',
            'locale' => $validated['locale'] ?? 'lv',
            'timezone' => $validated['timezone'] ?? 'Europe/Riga',
            'date_format' => $validated['date_format'] ?? 'dd.mm.yyyy',
            'amount_format' => $validated['amount_format'] ?? 'local',
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'region' => $validated['region'] ?? null,
            'country' => isset($validated['country']) ? strtoupper($validated['country']) : null,
            'postal_code' => $validated['postal_code'] ?? null,
            'phone_country' => $validated['phone_country'] ?? '+371',
            'theme_mode' => $validated['theme_mode'] ?? 'light',
            'email_notifications' => array_key_exists('email_notifications', $validated)
                ? (bool) $validated['email_notifications']
                : true,
            'push_notifications' => array_key_exists('push_notifications', $validated)
                ? (bool) $validated['push_notifications']
                : true,
            'marketing_notifications' => array_key_exists('marketing_notifications', $validated)
                ? (bool) $validated['marketing_notifications']
                : false,
            'compact_mode' => array_key_exists('compact_mode', $validated)
                ? (bool) $validated['compact_mode']
                : false,
            'default_dashboard_view' => $validated['default_dashboard_view'] ?? 'overview',
            'mask_balances' => array_key_exists('mask_balances', $validated)
                ? (bool) $validated['mask_balances']
                : false,
            'require_payment_confirmation' => array_key_exists('require_payment_confirmation', $validated)
                ? (bool) $validated['require_payment_confirmation']
                : true,
            'two_factor_secret' => $this->totpService->generateSecret(),
            'two_factor_enabled' => false,
            'two_factor_confirmed_at' => null,
            'password' => $validated['password'],
            'status' => 'active',
        ]));

        $starterAccount = Account::query()->create([
            'owner_user_id' => $user->id,
            'iban' => $this->generateUniqueIban(),
            'name' => 'Primary account',
            'currency' => self::STARTER_ACCOUNT_CURRENCY,
            'balance' => self::STARTER_ACCOUNT_BALANCE,
            'type' => 'personal',
            'status' => 'active',
        ]);

        $starterAccount->memberships()->create([
            'user_id' => $user->id,
            'member_role' => 'owner',
            'daily_limit' => null,
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        $this->writeAudit(
            $request,
            'auth.register',
            'user',
            $user->id,
            [
                'email' => $user->email,
                'role_code' => $user->role?->code,
                'starter_account_id' => $starterAccount->id,
                'starter_account_balance' => (float) $starterAccount->balance,
            ]
        );

        return response()->json([
            'message' => 'Reģistrācija izdevās. Pabeidz autentifikatora iestatīšanu, lai aktivizētu 2FA pieslēgšanos.',
            'token' => $token,
            'user' => $user->load('role'),
            'starter_account' => $starterAccount,
            'two_factor_setup' => $this->buildTwoFactorSetupPayload($user),
        ], 201);
    }

    
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->with('role')
            ->where('email', $validated['email'])
            ->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            $this->writeAudit(
                $request,
                'auth.login_failed',
                'user',
                $user?->id,
                [
                    'email' => $validated['email'],
                    'reason' => 'invalid_credentials',
                ]
            );

            return response()->json([
                'message' => 'Nederīgs e-pasts vai parole.',
            ], 422);
        }

        $isRevisionRequested = $user->status === 'blocked' && ! is_null($user->revision_requested_at);

        if ($user->status !== 'active' && $user->status !== 'pending' && ! $isRevisionRequested) {
            $this->writeAudit(
                $request,
                'auth.login_blocked',
                'user',
                $user->id,
                [
                    'email' => $user->email,
                    'status' => $user->status,
                ]
            );

            $message = match ($user->status) {
                'blocked' => 'Jūsu konts ir bloķēts. Lūdzu sazinieties ar atbalstu.',
                'pending' => 'Jūsu konts gaida administratora apstiprinājumu.',
                default => 'Lietotāja konts nav aktīvs.',
            };

            return response()->json([
                'message' => $message,
            ], 403);
        }

        // If 2FA is not enabled, allow direct login (2FA is optional)
        if (! $user->two_factor_enabled) {
            $token = $user->createToken('api-token')->plainTextToken;

            $this->writeAudit(
                $request,
                'auth.login_success_without_2fa',
                'user',
                $user->id,
                [
                    'email' => $user->email,
                ]
            );

            return response()->json([
                'message' => 'Pieslēgšanās sekmīga.',
                'token' => $token,
                'user' => $user->fresh()->load('role'),
            ]);
        }

        if (! $user->two_factor_secret) {
            return response()->json([
                'message' => 'Šim kontam 2FA konfigurācija nav pilnīga.',
            ], 403);
        }

        $ticket = Str::random(64);
        Cache::put($this->ticketCacheKey($ticket), [
            'user_id' => $user->id,
            'issued_at' => now()->toIso8601String(),
        ], now()->addSeconds(self::TICKET_TTL_SECONDS));

        $this->writeAudit(
            $request,
            'auth.login_challenge_issued',
            'user',
            $user->id,
            [
                'email' => $user->email,
                'role_code' => $user->role?->code,
                'ticket' => substr($ticket, 0, 8).'...',
            ]
        );

        return response()->json([
            'message' => 'Two-factor code required',
            'requires_two_factor' => true,
            'two_factor_ticket' => $ticket,
        ]);
    }

    
    public function completeTwoFactorChallenge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ticket' => ['required', 'string', 'size:64'],
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $ticketKey = $this->ticketCacheKey($validated['ticket']);
        $payload = Cache::get($ticketKey);

        if (! is_array($payload) || ! isset($payload['user_id'])) {
            return response()->json([
                'message' => 'Two-factor session expired. Please login again.',
            ], 422);
        }

        $user = User::query()->with('role')->find((int) $payload['user_id']);

        if (! $user || ! $user->two_factor_enabled || ! $user->two_factor_secret) {
            Cache::forget($ticketKey);

            return response()->json([
                'message' => 'Two-factor challenge is no longer valid.',
            ], 422);
        }

        $code = preg_replace('/\s+/', '', (string) $validated['code']) ?? '';

        if (! $this->totpService->verifyCode((string) $user->two_factor_secret, $code)) {
            $this->writeAudit(
                $request,
                'auth.login_challenge_failed',
                'user',
                $user->id,
                [
                    'reason' => 'invalid_totp',
                ]
            );

            return response()->json([
                'message' => 'Invalid authenticator code.',
            ], 422);
        }

        Cache::forget($ticketKey);

        $token = $user->createToken('api-token')->plainTextToken;

        $this->writeAudit(
            $request,
            'auth.login',
            'user',
            $user->id,
            [
                'email' => $user->email,
                'role_code' => $user->role?->code,
                'two_factor' => 'totp',
            ]
        );

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => $user,
        ]);
    }

    
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return response()->json([
            'user' => $user,
        ]);
    }

    
    public function logout(Request $request): JsonResponse
    {
        $tokenId = $request->user()?->currentAccessToken()?->id;

        $this->writeAudit(
            $request,
            'auth.logout',
            'user',
            $request->user()?->id,
            [
                'token_id' => $tokenId,
            ]
        );

        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logout successful',
        ]);
    }

    
    public function twoFactorStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
            'email_verified_at' => $user->email_verified_at,
        ]);
    }

    
    public function setupTwoFactor(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->two_factor_enabled) {
            return response()->json([
                'message' => 'Two-factor authentication is already enabled.',
            ], 422);
        }

        if (! $user->two_factor_secret) {
            $user->update([
                'two_factor_secret' => $this->totpService->generateSecret(),
            ]);
        }

        return response()->json([
            'message' => 'Scan the QR entry in Microsoft Authenticator (or any TOTP app), then confirm with a 6-digit code.',
            'two_factor_setup' => $this->buildTwoFactorSetupPayload($user->fresh()),
        ]);
    }

    
    public function enableTwoFactor(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->two_factor_enabled) {
            return response()->json([
                'message' => 'Two-factor authentication is already enabled.',
                'user' => $user->load('role'),
            ]);
        }

        if (! $user->two_factor_secret) {
            return response()->json([
                'message' => 'Two-factor setup is missing. Request setup payload first.',
            ], 422);
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $code = preg_replace('/\s+/', '', (string) $validated['code']) ?? '';

        if (! $this->totpService->verifyCode((string) $user->two_factor_secret, $code)) {
            return response()->json([
                'message' => 'Invalid authenticator code.',
            ], 422);
        }

        $user->update([
            'two_factor_enabled' => true,
            'two_factor_confirmed_at' => now(),
            'email_verified_at' => $user->email_verified_at ?? now(),
        ]);

        $this->writeAudit(
            $request,
            'auth.two_factor_enabled',
            'user',
            $user->id,
            [
                'method' => 'totp',
            ]
        );

        return response()->json([
            'message' => 'Two-factor authentication enabled. You can now login with authenticator code.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => $this->personNameRules(),
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'preferred_currency' => ['nullable', 'string', Rule::in(self::ALLOWED_CURRENCIES)],
            'locale' => ['nullable', 'string', Rule::in(self::ALLOWED_LOCALES)],
            'timezone' => ['nullable', 'string', Rule::in(self::ALLOWED_TIMEZONES)],
            'date_format' => ['nullable', 'string', Rule::in(self::ALLOWED_DATE_FORMATS)],
            'amount_format' => ['nullable', 'string', Rule::in(self::ALLOWED_AMOUNT_FORMATS)],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'region' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'size:2'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'phone_country' => ['nullable', 'string', 'max:8'],
            'theme_mode' => ['nullable', 'string', Rule::in(self::ALLOWED_THEME_MODES)],
            'email_notifications' => ['nullable', 'boolean'],
            'push_notifications' => ['nullable', 'boolean'],
            'marketing_notifications' => ['nullable', 'boolean'],
            'compact_mode' => ['nullable', 'boolean'],
            'default_dashboard_view' => ['nullable', 'string', Rule::in(self::ALLOWED_DASHBOARD_VIEWS)],
            'mask_balances' => ['nullable', 'boolean'],
            'require_payment_confirmation' => ['nullable', 'boolean'],
        ], [
            'name.regex' => 'Ievadi divus vārdus, izmantojot tikai burtus un atstarpi. Maksimums 20 simboli.',
        ]);

        $before = $user->only([
            'name',
            'email',
            'preferred_currency',
            'locale',
            'timezone',
            'date_format',
            'amount_format',
            'address',
            'phone',
            'region',
            'country',
            'postal_code',
            'phone_country',
            'theme_mode',
            'email_notifications',
            'push_notifications',
            'marketing_notifications',
            'compact_mode',
            'default_dashboard_view',
            'mask_balances',
            'require_payment_confirmation',
            'profile_picture',
        ]);

        $wasProfileComplete = $this->profileHasRequiredFields($before);

        $user->update($this->filterUserColumns([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'preferred_currency' => $validated['preferred_currency'] ?? ($user->preferred_currency ?? 'EUR'),
            'locale' => $validated['locale'] ?? ($user->locale ?? 'lv'),
            'timezone' => $validated['timezone'] ?? ($user->timezone ?? 'Europe/Riga'),
            'date_format' => $validated['date_format'] ?? ($user->date_format ?? 'dd.mm.yyyy'),
            'amount_format' => $validated['amount_format'] ?? ($user->amount_format ?? 'local'),
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'region' => $validated['region'] ?? null,
            'country' => isset($validated['country']) ? strtoupper($validated['country']) : null,
            'postal_code' => $validated['postal_code'] ?? null,
            'phone_country' => $validated['phone_country'] ?? ($user->phone_country ?? '+371'),
            'theme_mode' => $validated['theme_mode'] ?? ($user->theme_mode ?? 'light'),
            'email_notifications' => array_key_exists('email_notifications', $validated)
                ? (bool) $validated['email_notifications']
                : (bool) ($user->email_notifications ?? true),
            'push_notifications' => array_key_exists('push_notifications', $validated)
                ? (bool) $validated['push_notifications']
                : (bool) ($user->push_notifications ?? true),
            'marketing_notifications' => array_key_exists('marketing_notifications', $validated)
                ? (bool) $validated['marketing_notifications']
                : (bool) ($user->marketing_notifications ?? false),
            'compact_mode' => array_key_exists('compact_mode', $validated)
                ? (bool) $validated['compact_mode']
                : (bool) ($user->compact_mode ?? false),
            'default_dashboard_view' => $validated['default_dashboard_view'] ?? ($user->default_dashboard_view ?? 'overview'),
            'mask_balances' => array_key_exists('mask_balances', $validated)
                ? (bool) $validated['mask_balances']
                : (bool) ($user->mask_balances ?? false),
            'require_payment_confirmation' => array_key_exists('require_payment_confirmation', $validated)
                ? (bool) $validated['require_payment_confirmation']
                : (bool) ($user->require_payment_confirmation ?? true),
        ]));

        if (
            ! $user->isAdmin()
            && $user->status !== 'pending'
            && $user->hasCompleteProfile()
            && (! $wasProfileComplete || $user->status === 'blocked')
        ) {
            $user->forceFill([
                'status' => 'pending',
                'revision_requested_at' => null,
            ])->save();
        }

        $this->writeAudit(
            $request,
            'auth.profile_updated',
            'user',
            $user->id,
            [
                'before' => $before,
                'changes' => $user->getChanges(),
            ]
        );

        return response()->json([
            'message' => 'Profils atjaunināts veiksmīgi.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

    private function profileHasRequiredFields(array $profile): bool
    {
        foreach (['address', 'phone', 'region', 'country', 'postal_code'] as $field) {
            $value = $profile[$field] ?? null;

            if (! is_string($value) || trim($value) === '') {
                return false;
            }
        }

        return true;
    }

   
    public function uploadProfilePicture(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'profile_picture' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $oldPath = $this->extractStoragePath($user->profile_picture);
        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        $storedPath = $validated['profile_picture']->store("avatars/users/{$user->id}", 'public');
        $publicUrl = Storage::disk('public')->url($storedPath);

        $user->update([
            'profile_picture' => $publicUrl,
        ]);

        $this->writeAudit(
            $request,
            'auth.profile_picture_updated',
            'user',
            $user->id,
            [
                'previous_picture' => $oldPath,
                'new_picture' => $storedPath,
            ]
        );

        return response()->json([
            'message' => 'Profila attēls atjaunināts veiksmīgi.',
            'user' => $user->fresh()->load('role'),
        ]);
    }

   
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => $this->strongPasswordRules('current_password'),
        ], [
            'new_password.regex' => 'Parolei jābūt vismaz 8 simbolus garai, ar vienu lielo burtu, vienu mazo burtu un vienu ciparu.',
        ]);

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Esošā parole nav pareiza.',
            ], 422);
        }

        $user->update([
            'password' => $validated['new_password'],
        ]);

        $this->writeAudit(
            $request,
            'auth.password_changed',
            'user',
            $user->id,
            [
                'changed_at' => now()->toIso8601String(),
            ]
        );

        return response()->json([
            'message' => 'Parole nomainīta veiksmīgi.',
        ]);
    }

    
    private function personNameRules(): array
    {
        return [
            'required',
            'string',
            'max:20',
            'regex:'.self::PERSON_NAME_REGEX,
        ];
    }

    
    private function strongPasswordRules(?string $differentField = null): array
    {
        $rules = [
            'required',
            'string',
            'min:8',
            'regex:'.self::STRONG_PASSWORD_REGEX,
            'confirmed',
        ];

        if ($differentField) {
            $rules[] = 'different:'.$differentField;
        }

        return $rules;
    }

    
    private function extractStoragePath(?string $profilePictureUrl): ?string
    {
        if (! $profilePictureUrl) {
            return null;
        }

        $path = parse_url($profilePictureUrl, PHP_URL_PATH);
        if (! is_string($path) || ! str_starts_with($path, '/storage/')) {
            return null;
        }

        return ltrim(substr($path, strlen('/storage/')), '/');
    }

    private function buildTwoFactorSetupPayload(User $user): array
    {
        $secret = (string) $user->two_factor_secret;
        $label = self::OTP_ISSUER.':'.$user->email;

        return [
            'issuer' => self::OTP_ISSUER,
            'label' => $label,
            'secret' => $secret,
            'otpauth_url' => $this->totpService->buildOtpAuthUri(self::OTP_ISSUER, $label, $secret),
            'app_hint' => 'Microsoft Authenticator works. Use Add account -> Other account (TOTP), then enter the secret key manually.',
        ];
    }

    private function ticketCacheKey(string $ticket): string
    {
        return 'auth:2fa:ticket:'.$ticket;
    }

    
    private function generateUniqueIban(): string
    {
        do {
            $iban = sprintf('LV%02dBANK%010d', random_int(10, 99), random_int(0, 9999999999));
        } while (Account::query()->where('iban', $iban)->exists());

        return $iban;
    }

    
    private function filterUserColumns(array $attributes): array
    {
        static $knownColumns = null;

        if (! is_array($knownColumns)) {
            $knownColumns = array_flip(Schema::getColumnListing('users'));
        }

        return array_filter(
            $attributes,
            static fn (string $column): bool => array_key_exists($column, $knownColumns),
            ARRAY_FILTER_USE_KEY
        );
    }
}
