<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountMember;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountMemberController extends Controller
{

    public function index(Request $request, Account $account): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        if (! $this->canViewMembers($user, $account)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $members = $account->memberships()
            ->with('user:id,name,email,status')
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'members' => $members,
        ]);
    }


    public function candidates(Request $request, Account $account): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        if (! $this->canManageMembers($user, $account)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($closedResponse = $this->closedAccountResponse($account)) {
            return $closedResponse;
        }

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
            'include_inactive' => ['nullable', 'boolean'],
        ]);

        $query = User::query()
            ->select(['id', 'name', 'email', 'status', 'role_id'])
            ->with('role:id,code,name_lv');

        $query->whereNotNull('address')
            ->whereNotNull('phone')
            ->whereNotNull('region')
            ->whereNotNull('country')
            ->whereNotNull('postal_code')
            ->where('address', '!=', '')
            ->where('phone', '!=', '')
            ->where('region', '!=', '')
            ->where('country', '!=', '')
            ->where('postal_code', '!=', '');

        $excludedUserIds = AccountMember::query()
            ->where('account_id', $account->id)
            ->pluck('user_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $excludedUserIds[] = (int) $account->owner_user_id;

        $query->whereNotIn('id', array_values(array_unique($excludedUserIds)));

        if (empty($validated['include_inactive'])) {
            $query->where('status', 'active');
        }

        if (! empty($validated['q'])) {
            $term = trim($validated['q']);
            $query->where(function ($subQuery) use ($term) {
                $subQuery->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%");
            });
        }

        $limit = (int) ($validated['limit'] ?? 12);

        $candidates = $query
            ->orderBy('name')
            ->limit($limit)
            ->get();

        return response()->json([
            'candidates' => $candidates,
        ]);
    }


    public function store(Request $request, Account $account): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        if (! $this->canManageMembers($user, $account)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($closedResponse = $this->closedAccountResponse($account)) {
            return $closedResponse;
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'member_role' => ['required', 'in:viewer,operator,approver'],
            'daily_limit' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ((int) $validated['user_id'] === (int) $account->owner_user_id) {
            return response()->json([
                'message' => 'Owner membership is already assigned',
            ], 422);
        }

        $targetUser = User::query()->findOrFail($validated['user_id']);

        if ($targetUser->status !== 'active' || ! $targetUser->hasCompleteProfile()) {
            return response()->json([
                'message' => 'Lietotājam nav pabeigts profils vai konts nav aktīvs',
            ], 422);
        }

        $alreadyMember = AccountMember::query()
            ->where('account_id', $account->id)
            ->where('user_id', $validated['user_id'])
            ->exists();

        if ($alreadyMember) {
            return response()->json([
                'message' => 'User is already a member of this account',
            ], 422);
        }

        $member = AccountMember::query()->create([
            'account_id' => $account->id,
            'user_id' => (int) $validated['user_id'],
            'member_role' => $validated['member_role'],
            'daily_limit' => $validated['daily_limit'] ?? null,
        ]);

        $this->writeAudit(
            $request,
            'account.member_added',
            'account_member',
            $member->id,
            [
                'account_id' => $account->id,
                'user_id' => $member->user_id,
                'member_role' => $member->member_role,
                'daily_limit' => $member->daily_limit,
            ]
        );

        return response()->json([
            'message' => 'Account member added',
            'member' => $member->load('user:id,name,email,status'),
        ], 201);
    }

 
    public function update(Request $request, Account $account, AccountMember $member): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        if (! $this->canManageMembers($user, $account)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($closedResponse = $this->closedAccountResponse($account)) {
            return $closedResponse;
        }

        if ((int) $member->account_id !== (int) $account->id) {
            return response()->json(['message' => 'Member not found for account'], 404);
        }

        if ((int) $member->user_id === (int) $account->owner_user_id || $member->member_role === 'owner') {
            return response()->json([
                'message' => 'Owner membership cannot be modified',
            ], 422);
        }

        $validated = $request->validate([
            'member_role' => ['sometimes', 'in:viewer,operator,approver'],
            'daily_limit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ]);

        $before = $member->only(['member_role', 'daily_limit']);
        $member->update($validated);

        $this->writeAudit(
            $request,
            'account.member_updated',
            'account_member',
            $member->id,
            [
                'account_id' => $account->id,
                'before' => $before,
                'changes' => $member->getChanges(),
            ]
        );

        return response()->json([
            'message' => 'Account member updated',
            'member' => $member->fresh()->load('user:id,name,email,status'),
        ]);
    }

 
    public function destroy(Request $request, Account $account, AccountMember $member): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        if (! $this->canManageMembers($user, $account)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($closedResponse = $this->closedAccountResponse($account)) {
            return $closedResponse;
        }

        if ((int) $member->account_id !== (int) $account->id) {
            return response()->json(['message' => 'Member not found for account'], 404);
        }

        if ((int) $member->user_id === (int) $account->owner_user_id || $member->member_role === 'owner') {
            return response()->json([
                'message' => 'Owner membership cannot be removed',
            ], 422);
        }

        $this->writeAudit(
            $request,
            'account.member_removed',
            'account_member',
            $member->id,
            [
                'account_id' => $account->id,
                'user_id' => $member->user_id,
                'member_role' => $member->member_role,
            ]
        );

        $member->delete();

        return response()->json([
            'message' => 'Account member removed',
        ]);
    }


    private function canViewMembers($user, Account $account): bool
    {
        if ($user->isAdmin() || (int) $account->owner_user_id === (int) $user->id) {
            return true;
        }

        return AccountMember::query()
            ->where('account_id', $account->id)
            ->where('user_id', $user->id)
            ->exists();
    }


    private function canManageMembers($user, Account $account): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return (int) $account->owner_user_id === (int) $user->id;
    }

    private function closedAccountResponse(Account $account): ?JsonResponse
    {
        if ($account->status !== 'closed') {
            return null;
        }

        return response()->json([
            'message' => 'Closed account members cannot be modified',
        ], 422);
    }
}
