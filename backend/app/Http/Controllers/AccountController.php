<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    private const NEW_ACCOUNT_STARTER_BALANCE = 500;


    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('role');
        $accessibleAccountIds = $this->accessibleAccountIds($user);

        $query = Account::query()->with([
            'owner:id,name,email',
            'members:id,name,email',
        ]);

        if (! $user->isAdmin()) {
            $query->whereIn('id', $accessibleAccountIds);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($currency = $request->query('currency')) {
            $query->where('currency', $currency);
        }

        if ($q = $request->query('q')) {
            $query->where(function ($subQuery) use ($q) {
                $subQuery->where('name', 'like', "%{$q}%")
                    ->orWhere('iban', 'like', "%{$q}%");
            });
        }

        $allowedSortFields = ['created_at', 'name', 'balance', 'status'];
        $sortBy = in_array($request->query('sort_by'), $allowedSortFields, true)
            ? $request->query('sort_by')
            : 'created_at';
        $sortDir = $request->query('sort_dir') === 'asc' ? 'asc' : 'desc';

        $perPage = min((int) $request->query('per_page', 15), 100);
        $accounts = $query->orderBy($sortBy, $sortDir)->paginate($perPage);
        $accounts->getCollection()->transform(fn (Account $account) => $this->decorateAccountForUser($account, $user));

        return response()->json($accounts);
    }


    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'currency' => ['required', 'string', 'size:3'],
            'type' => ['required', 'in:personal,business,savings'],
            'company_name' => ['required_if:type,business', 'nullable', 'string', 'max:120'],
            'registration_number' => ['required_if:type,business', 'nullable', 'string', 'max:20', 'regex:/^[A-Za-z0-9-]+$/'],
            'vat_number' => ['nullable', 'string', 'max:20', 'regex:/^[A-Za-z0-9-]+$/'],
            'first_name' => ['required_if:type,savings', 'nullable', 'string', 'max:40', "regex:/^[\\pL\\s'-]+$/u"],
            'last_name' => ['required_if:type,savings', 'nullable', 'string', 'max:40', "regex:/^[\\pL\\s'-]+$/u"],
            'personal_code' => ['required_if:type,savings', 'nullable', 'string', 'max:12', 'regex:/^[0-9-]+$/'],
        ]);

        $user = $request->user();

        $account = Account::query()->create([
            'owner_user_id' => $user->id,
            'iban' => $this->generateUniqueIban(),
            'name' => $validated['name'],
            'currency' => strtoupper($validated['currency']),
            'balance' => self::NEW_ACCOUNT_STARTER_BALANCE,
            'type' => $validated['type'],
            'company_name' => $validated['company_name'] ?? null,
            'registration_number' => $validated['registration_number'] ?? null,
            'vat_number' => $validated['vat_number'] ?? null,
            'first_name' => $validated['first_name'] ?? null,
            'last_name' => $validated['last_name'] ?? null,
            'personal_code' => $validated['personal_code'] ?? null,
            'status' => 'active',
        ]);

        $account->memberships()->create([
            'user_id' => $user->id,
            'member_role' => 'owner',
            'daily_limit' => null,
        ]);

        $this->writeAudit(
            $request,
            'account.created',
            'account',
            $account->id,
            [
                'name' => $account->name,
                'currency' => $account->currency,
                'type' => $account->type,
            ]
        );

        return response()->json([
            'message' => 'Account created successfully',
            'account' => $this->decorateAccountForUser($account->load(['owner:id,name,email', 'members:id,name,email']), $user),
        ], 201);
    }


    public function show(Request $request, Account $account): JsonResponse
    {
        $user = $request->user()->loadMissing('role');
        $accessibleAccountIds = $this->accessibleAccountIds($user);

        if (! $user->isAdmin() && ! in_array($account->id, $accessibleAccountIds, true)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $account->load([
            'owner:id,name,email',
            'members:id,name,email',
            'outgoingTransactions' => fn ($query) => $query->latest()->limit(20),
            'incomingTransactions' => fn ($query) => $query->latest()->limit(20),
        ]);

        return response()->json([
            'account' => $this->decorateAccountForUser($account, $user),
        ]);
    }


    public function update(Request $request, Account $account): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        $canUpdateStatus = $this->canUpdateStatus($user, $account);
        $canUpdateMetadata = $user->isAdmin() || (int) $account->owner_user_id === (int) $user->id;

        if (! $canUpdateMetadata && ! $canUpdateStatus) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'status' => ['sometimes', 'in:active,frozen,closed'],
            'type' => ['sometimes', 'in:personal,business,savings'],
            'company_name' => ['required_if:type,business', 'nullable', 'string', 'max:120'],
            'registration_number' => ['required_if:type,business', 'nullable', 'string', 'max:20', 'regex:/^[A-Za-z0-9-]+$/'],
            'vat_number' => ['nullable', 'string', 'max:20', 'regex:/^[A-Za-z0-9-]+$/'],
            'first_name' => ['required_if:type,savings', 'nullable', 'string', 'max:40', "regex:/^[\\pL\\s'-]+$/u"],
            'last_name' => ['required_if:type,savings', 'nullable', 'string', 'max:40', "regex:/^[\\pL\\s'-]+$/u"],
            'personal_code' => ['required_if:type,savings', 'nullable', 'string', 'max:12', 'regex:/^[0-9-]+$/'],
        ]);

        if (! $canUpdateMetadata) {
            $validated = array_intersect_key($validated, ['status' => true]);
        }

        if (
            array_key_exists('status', $validated)
            && $validated['status'] === 'closed'
            && ! $canUpdateMetadata
        ) {
            return response()->json([
                'message' => 'Member role cannot close accounts',
            ], 403);
        }

        if (
            $account->status === 'closed'
            && array_key_exists('status', $validated)
            && $validated['status'] !== 'closed'
        ) {
            return response()->json([
                'message' => 'Closed account status cannot be changed',
            ], 422);
        }

        $before = $account->only(['name', 'status', 'type']);

        $account->update($validated);

        $this->writeAudit(
            $request,
            'account.updated',
            'account',
            $account->id,
            [
                'before' => $before,
                'changes' => $account->getChanges(),
            ]
        );

        return response()->json([
            'message' => 'Account updated successfully',
            'account' => $this->decorateAccountForUser(
                $account->fresh()->load(['owner:id,name,email', 'members:id,name,email']),
                $user
            ),
        ]);
    }


    public function destroy(Request $request, Account $account): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        if (! $user->isAdmin() && $account->owner_user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $account->update(['status' => 'closed']);

        $this->writeAudit(
            $request,
            'account.closed',
            'account',
            $account->id,
            [
                'iban' => $account->iban,
                'name' => $account->name,
            ]
        );

        return response()->json([
            'message' => 'Account closed successfully',
        ]);
    }


    private function accessibleAccountIds($user): array
    {
        $ownedIds = Account::query()
            ->where('owner_user_id', $user->id)
            ->pluck('id')
            ->all();

        $memberIds = $user->accountMemberships()
            ->pluck('account_id')
            ->all();

        return array_values(array_unique(array_map('intval', array_merge($ownedIds, $memberIds))));
    }

    private function decorateAccountForUser(Account $account, $user): Account
    {
        $role = $this->accountRoleForUser($account, $user);

        $account->setAttribute('access_role', $role);
        $account->setAttribute('can_initiate_transfer', $account->status === 'active' && in_array($role, ['admin', 'owner', 'viewer', 'operator'], true));
        $account->setAttribute('can_update_status', $account->status !== 'closed' && $this->canUpdateStatus($user, $account));
        $account->setAttribute('can_close_account', $user->isAdmin() || (int) $account->owner_user_id === (int) $user->id);

        return $account;
    }

    private function accountRoleForUser(Account $account, $user): string
    {
        if ($user->isAdmin()) {
            return 'admin';
        }

        if ((int) $account->owner_user_id === (int) $user->id) {
            return 'owner';
        }

        $memberRole = AccountMember::query()
            ->where('account_id', $account->id)
            ->where('user_id', $user->id)
            ->value('member_role');

        return is_string($memberRole) ? $memberRole : 'none';
    }

    private function canUpdateStatus($user, Account $account): bool
    {
        if ($user->isAdmin() || (int) $account->owner_user_id === (int) $user->id) {
            return true;
        }

        return AccountMember::query()
            ->where('account_id', $account->id)
            ->where('user_id', $user->id)
            ->where('member_role', 'approver')
            ->exists();
    }

 
    private function generateUniqueIban(): string
    {
        do {
            $iban = sprintf('LV%02dBANK%010d', random_int(10, 99), random_int(0, 9999999999));
        } while (Account::query()->where('iban', $iban)->exists());

        return $iban;
    }
}
