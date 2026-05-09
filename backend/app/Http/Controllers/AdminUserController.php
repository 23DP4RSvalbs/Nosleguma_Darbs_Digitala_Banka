<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\BankNotification;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\TransferApproval;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{

    public function metrics(): JsonResponse
    {
        $usersByStatus = User::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $accountsByStatus = Account::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $transactionsByStatus = Transaction::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $outgoingVolume30d = (float) Transaction::query()
            ->where('status', 'completed')
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('COALESCE(SUM(amount + fee), 0) as total')
            ->value('total');

        return response()->json([
            'users' => [
                'total' => User::query()->count(),
                'active' => (int) ($usersByStatus['active'] ?? 0),
                'blocked' => (int) ($usersByStatus['blocked'] ?? 0),
                'pending' => (int) ($usersByStatus['pending'] ?? 0),
            ],
            'accounts' => [
                'total' => Account::query()->count(),
                'active' => (int) ($accountsByStatus['active'] ?? 0),
                'frozen' => (int) ($accountsByStatus['frozen'] ?? 0),
                'closed' => (int) ($accountsByStatus['closed'] ?? 0),
            ],
            'transactions' => [
                'total' => Transaction::query()->count(),
                'pending' => (int) ($transactionsByStatus['pending'] ?? 0),
                'completed' => (int) ($transactionsByStatus['completed'] ?? 0),
                'rejected' => (int) ($transactionsByStatus['rejected'] ?? 0),
                'failed' => (int) ($transactionsByStatus['failed'] ?? 0),
            ],
            'approvals' => [
                'pending' => TransferApproval::query()->where('status', 'pending')->count(),
            ],
            'operations' => [
                'today_transactions' => Transaction::query()->whereDate('created_at', now()->toDateString())->count(),
                'unread_notifications' => BankNotification::query()->where('is_read', false)->count(),
                'audit_events_24h' => AuditLog::query()->where('created_at', '>=', now()->subDay())->count(),
                'outgoing_volume_30d' => round($outgoingVolume30d, 2),
            ],
        ]);
    }


    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,blocked,pending'],
            'role_code' => ['nullable', 'string', 'max:40'],
            'sort_by' => ['nullable', 'in:created_at,name,email,status'],
            'sort_dir' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = User::query()->with('role:id,code,name_lv');
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

        if (! empty($validated['q'])) {
            $q = $validated['q'];
            $query->where(function ($subQuery) use ($q) {
                $subQuery->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['role_code'])) {
            $query->whereHas('role', function ($roleQuery) use ($validated) {
                $roleQuery->where('code', $validated['role_code']);
            });
        }

        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDir = $validated['sort_dir'] ?? 'desc';
        $perPage = (int) ($validated['per_page'] ?? 20);

        $users = $query
            ->orderBy($sortBy, $sortDir)
            ->paginate($perPage);

        return response()->json($users);
    }


    public function roles(): JsonResponse
    {
        $roles = Role::query()
            ->orderBy('code')
            ->get(['id', 'code', 'name_lv']);

        return response()->json([
            'roles' => $roles,
        ]);
    }

   
    public function update(Request $request, User $managedUser): JsonResponse
    {
        $admin = $request->user()->loadMissing('role');
        $managedUser->loadMissing('role');

        $validated = $request->validate([
            'role_id' => ['sometimes', 'integer', 'exists:roles,id'],
            'status' => ['sometimes', 'in:active,blocked,pending'],
        ]);

        if (empty($validated)) {
            return response()->json([
                'message' => 'No changes provided',
            ], 422);
        }

        if ($managedUser->status === 'pending') {
            $statusProvided = array_key_exists('status', $validated);

            if (! $statusProvided) {
                return response()->json([
                    'message' => 'Pending lietotāju var tikai apstiprинāt vai noradit',
                ], 422);
            }

            if ($validated['status'] !== 'active' && $validated['status'] !== 'blocked') {
                return response()->json([
                    'message' => 'Pending lietotāju var tikai apstiprинāt vai noradit',
                ], 422);
            }
        }

        if (array_key_exists('status', $validated) && $validated['status'] === 'active') {
            $managedUser->revision_requested_at = null;
        }

        $managedUserIsAdmin = $managedUser->role?->code === 'admin';
        $nextRole = null;

        if (array_key_exists('role_id', $validated) && ! is_null($validated['role_id'])) {
            $nextRole = Role::query()->find($validated['role_id']);
        }

        if ((int) $managedUser->id === (int) $admin->id) {
            if (array_key_exists('status', $validated) && $validated['status'] !== 'active') {
                return response()->json([
                    'message' => 'Admin cannot deactivate own account',
                ], 422);
            }

            if (array_key_exists('role_id', $validated) && ! is_null($validated['role_id'])) {
                if ($nextRole?->code !== 'admin') {
                    return response()->json([
                        'message' => 'Admin cannot remove own admin role',
                    ], 422);
                }
            }
        }

        $demotesAdminRole =
            $managedUserIsAdmin
            && array_key_exists('role_id', $validated)
            && $nextRole?->code !== 'admin';

        $deactivatesAdminAccount =
            $managedUserIsAdmin
            && $managedUser->status === 'active'
            && array_key_exists('status', $validated)
            && $validated['status'] !== 'active';

        if (($demotesAdminRole || $deactivatesAdminAccount) && $this->activeAdminCount() <= 1) {
            $this->writeAudit(
                $request,
                'admin.user_update_blocked',
                'user',
                $managedUser->id,
                [
                    'reason' => 'last_active_admin_protection',
                    'attempted_changes' => $validated,
                ]
            );

            return response()->json([
                'message' => 'Cannot remove or deactivate the last active admin',
            ], 422);
        }

        $before = $managedUser->only(['role_id', 'status', 'email']);

        // If pending user is being moved to 'blocked', mark it as a revision request.
        if ($managedUser->status === 'pending' && isset($validated['status']) && $validated['status'] === 'blocked') {
            $validated['status'] = 'blocked';
            $managedUser->revision_requested_at = now();
        }

        $managedUser->update($validated);

        $this->writeAudit(
            $request,
            'admin.user_updated',
            'user',
            $managedUser->id,
            [
                'admin_user_id' => $admin->id,
                'before' => $before,
                'changes' => $managedUser->getChanges(),
            ]
        );

        $managedUser->refresh();
        $managedUser->load('role:id,code,name_lv');

        return response()->json([
            'message' => 'User updated',
            'user' => $managedUser,
        ]);
    }

    private function activeAdminCount(): int
    {
        return User::query()
            ->where('status', 'active')
            ->whereHas('role', function ($query) {
                $query->where('code', 'admin');
            })
            ->count();
    }
}
