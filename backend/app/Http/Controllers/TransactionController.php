<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\AccountMember;
use App\Models\AuditLog;
use App\Models\BankNotification;
use App\Models\Transaction;
use App\Models\TransferApproval;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TransactionController extends Controller
{
    private const TRANSFER_FEE_PERCENT = 2.5;

    
    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('role');
        $accessibleAccountIds = $this->accessibleAccountIds($user);

        $query = Transaction::query()
            ->select([
                'transactions.*',
                'sender.iban as from_iban',
                'receiver.iban as to_iban',
                'initiator.name as initiator_name',
            ])
            ->join('accounts as sender', 'sender.id', '=', 'transactions.from_account_id')
            ->join('accounts as receiver', 'receiver.id', '=', 'transactions.to_account_id')
            ->leftJoin('users as initiator', 'initiator.id', '=', 'transactions.initiator_user_id');

        if (! $user->isAdmin()) {
            $query->where(function ($subQuery) use ($accessibleAccountIds) {
                $subQuery->whereIn('transactions.from_account_id', $accessibleAccountIds)
                    ->orWhereIn('transactions.to_account_id', $accessibleAccountIds);
            });
        }

        if ($accountId = $request->query('account_id')) {
            $query->where(function ($subQuery) use ($accountId) {
                $subQuery->where('transactions.from_account_id', $accountId)
                    ->orWhere('transactions.to_account_id', $accountId);
            });
        }

        if ($status = $request->query('status')) {
            $query->where('transactions.status', $status);
        }

        if ($category = $request->query('category')) {
            $query->where('transactions.category', $category);
        }

        if ($q = $request->query('q')) {
            $query->where(function ($subQuery) use ($q) {
                $subQuery->where('transactions.reference', 'like', "%{$q}%")
                    ->orWhere('transactions.description', 'like', "%{$q}%");
            });
        }

        if ($minAmount = $request->query('amount_min')) {
            $query->where('transactions.amount', '>=', (float) $minAmount);
        }

        if ($maxAmount = $request->query('amount_max')) {
            $query->where('transactions.amount', '<=', (float) $maxAmount);
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('transactions.created_at', '>=', $dateFrom);
        }

        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('transactions.created_at', '<=', $dateTo);
        }

        $allowedSortFields = ['created_at', 'executed_at', 'amount', 'status'];
        $sortBy = in_array($request->query('sort_by'), $allowedSortFields, true)
            ? $request->query('sort_by')
            : 'created_at';
        $sortDir = $request->query('sort_dir') === 'asc' ? 'asc' : 'desc';

        $perPage = min((int) $request->query('per_page', 20), 100);
        $transactions = $query
            ->orderBy('transactions.'.$sortBy, $sortDir)
            ->paginate($perPage);

        return response()->json($transactions);
    }

   
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_account_id' => ['required', 'exists:accounts,id'],
            'to_account_id' => ['required', 'exists:accounts,id', 'different:from_account_id'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999999999.99'],
            'category' => ['nullable', 'in:transfer,salary,utilities,shopping,other'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user()->loadMissing('role');
        $accessibleAccountIds = $this->accessibleAccountIds($user);

        if (! $user->isAdmin() && ! in_array((int) $validated['from_account_id'], $accessibleAccountIds, true)) {
            return response()->json(['message' => 'Forbidden source account'], 403);
        }

        $fromAccount = Account::query()->findOrFail($validated['from_account_id']);
        $toAccount = Account::query()->findOrFail($validated['to_account_id']);

        if ($user->isAdmin()) {
            $fromOwner = $fromAccount->owner()->first();

            if ($fromOwner && $fromOwner->status !== 'active') {
                return response()->json([
                    'message' => 'No pending or blocked user-owned accounts can be used as transfer source',
                ], 422);
            }
        }

        if ($fromAccount->status !== 'active' || $toAccount->status !== 'active') {
            return response()->json([
                'message' => 'Only active accounts can be used for transfers',
            ], 422);
        }

        $amount = (float) $validated['amount'];
        $fee = round($amount * (self::TRANSFER_FEE_PERCENT / 100), 2);
        $totalDebit = $amount + $fee;
        $initiatorRole = $user->isAdmin() ? 'admin' : 'owner';
        $appliedDailyLimit = null;

        if (! $user->isAdmin()) {
            $isOwner = (int) $fromAccount->owner_user_id === (int) $user->id;

            if (! $isOwner) {
                $sourceMembership = AccountMember::query()
                    ->where('account_id', $fromAccount->id)
                    ->where('user_id', $user->id)
                    ->first();

                if (! $sourceMembership) {
                    return response()->json(['message' => 'Forbidden source account'], 403);
                }

                $initiatorRole = (string) $sourceMembership->member_role;

                if ($sourceMembership->member_role === 'approver') {
                    return response()->json([
                        'message' => 'Member role cannot initiate transfers',
                    ], 403);
                }

                if (! is_null($sourceMembership->daily_limit)) {
                    $appliedDailyLimit = (float) $sourceMembership->daily_limit;

                    $spentToday = (float) Transaction::query()
                        ->where('from_account_id', $fromAccount->id)
                        ->where('initiator_user_id', $user->id)
                        ->whereIn('status', ['pending', 'completed'])
                        ->whereDate('created_at', now()->toDateString())
                        ->selectRaw('COALESCE(SUM(amount + fee), 0) as total_spent')
                        ->value('total_spent');

                    if (($spentToday + $totalDebit) > $appliedDailyLimit) {
                        return response()->json([
                            'message' => 'Daily transfer limit exceeded',
                        ], 422);
                    }
                }
            }
        }

        if ((float) $fromAccount->balance < $totalDebit) {
            return response()->json([
                'message' => 'Insufficient funds',
            ], 422);
        }

        $transaction = Transaction::query()->create([
            'from_account_id' => $fromAccount->id,
            'to_account_id' => $toAccount->id,
            'initiator_user_id' => $user->id,
            'amount' => $amount,
            'fee' => $fee,
            'currency' => $fromAccount->currency,
            'category' => $validated['category'] ?? 'transfer',
            'status' => 'pending',
            'reference' => strtoupper(Str::random(12)),
            'description' => $validated['description'] ?? null,
            'executed_at' => null,
        ]);

        $approval = TransferApproval::query()->create([
            'transaction_id' => $transaction->id,
            'required_approvals' => 1,
            'current_approvals' => 0,
            'status' => 'pending',
        ]);

        $this->notifyApprovalPending($transaction, $fromAccount, $amount);

        $this->writeAudit(
            $request,
            'transaction.created',
            'transaction',
            $transaction->id,
            [
                'from_account_id' => $transaction->from_account_id,
                'to_account_id' => $transaction->to_account_id,
                'amount' => $transaction->amount,
                'fee' => $transaction->fee,
                'reference' => $transaction->reference,
                'initiator_role' => $initiatorRole,
                'applied_daily_limit' => $appliedDailyLimit,
                'status' => 'pending',
                'approval_id' => $approval->id,
            ]
        );

        return response()->json([
            'message' => 'Transaction pending approval',
            'transaction' => $transaction->load('approval'),
        ], 201);
    }

    
    public function approve(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user()->loadMissing('role');
        $approval = $transaction->approval;

        if (! $approval || $transaction->status !== 'pending' || $approval->status !== 'pending') {
            return response()->json([
                'message' => 'Transaction is not awaiting approval',
            ], 422);
        }

        if (! $this->canApproveTransfer($user, (int) $transaction->from_account_id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $alreadyApprovedByUser = AuditLog::query()
            ->where('user_id', $user->id)
            ->where('event_type', 'transaction.approved_step')
            ->where('resource_type', 'transaction')
            ->where('resource_id', $transaction->id)
            ->exists();

        if ($alreadyApprovedByUser) {
            return response()->json([
                'message' => 'User already approved this transaction',
            ], 422);
        }

        $approval->increment('current_approvals');
        $approval = $approval->fresh();

        $this->writeAudit(
            $request,
            'transaction.approved_step',
            'transaction',
            $transaction->id,
            [
                'approval_id' => $approval->id,
                'current_approvals' => $approval->current_approvals,
                'required_approvals' => $approval->required_approvals,
            ]
        );

        if ($approval->current_approvals < $approval->required_approvals) {
            return response()->json([
                'message' => 'Approval recorded',
                'transaction' => $transaction->fresh()->load('approval'),
            ]);
        }

        $executed = DB::transaction(function () use ($transaction, $approval) {
            $fromAccount = Account::query()
                ->whereKey($transaction->from_account_id)
                ->lockForUpdate()
                ->firstOrFail();

            $toAccount = Account::query()
                ->whereKey($transaction->to_account_id)
                ->lockForUpdate()
                ->firstOrFail();

            $amount = (float) $transaction->amount;
            $fee = (float) $transaction->fee;
            $totalDebit = $amount + $fee;

            if ((float) $fromAccount->balance < $totalDebit) {
                return false;
            }

            if ($fromAccount->status !== 'active' || $toAccount->status !== 'active') {
                return false;
            }

            $fromOwner = $fromAccount->owner()->first();
            $toOwner = $toAccount->owner()->first();

            if (($fromOwner && $fromOwner->status !== 'active') || ($toOwner && $toOwner->status !== 'active')) {
                return false;
            }

            $fromAccount->decrement('balance', $totalDebit);
            $toAccount->increment('balance', $amount);

            $transaction->update([
                'status' => 'completed',
                'executed_at' => now(),
                'currency' => $fromAccount->currency,
            ]);

            $approval->update([
                'status' => 'approved',
            ]);

            $senderOwnerId = (int) $fromAccount->owner_user_id;
            $receiverOwnerId = (int) $toAccount->owner_user_id;

            BankNotification::query()->create([
                'user_id' => $senderOwnerId,
                'type' => 'transaction',
                'title' => 'Maksajums nosutits',
                'message' => 'Nosutits maksajums '.$amount.' '.$fromAccount->currency.'. Ref: '.$transaction->reference,
                'is_read' => false,
                'sent_at' => now(),
            ]);

            if ($receiverOwnerId !== $senderOwnerId) {
                BankNotification::query()->create([
                    'user_id' => $receiverOwnerId,
                    'type' => 'transaction',
                    'title' => 'Maksajums sanemts',
                    'message' => 'Sanemts maksajums '.$amount.' '.$toAccount->currency.'. Ref: '.$transaction->reference,
                    'is_read' => false,
                    'sent_at' => now(),
                ]);
            }

            return true;
        });

        if (! $executed) {
            $transaction->update([
                'status' => 'failed',
            ]);

            $approval->update([
                'status' => 'rejected',
            ]);

            BankNotification::query()->create([
                'user_id' => (int) $transaction->initiator_user_id,
                'type' => 'transaction',
                'title' => 'Maksajums neizdevies',
                'message' => 'Maksajums neizdevies nepietiekamu lidzeklu del. Ref: '.$transaction->reference,
                'is_read' => false,
                'sent_at' => now(),
            ]);

            $this->writeAudit(
                $request,
                'transaction.failed_at_approval',
                'transaction',
                $transaction->id,
                [
                    'reason' => 'insufficient_funds',
                ]
            );

            return response()->json([
                'message' => 'Transaction failed at approval time due to insufficient funds',
                'transaction' => $transaction->fresh()->load('approval'),
            ], 422);
        }

        $this->writeAudit(
            $request,
            'transaction.approved',
            'transaction',
            $transaction->id,
            [
                'approval_id' => $approval->id,
                'approver_user_id' => $user->id,
            ]
        );

        return response()->json([
            'message' => 'Transaction approved and executed',
            'transaction' => $transaction->fresh()->load('approval'),
        ]);
    }

    
    public function reject(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user()->loadMissing('role');
        $approval = $transaction->approval;

        if (! $approval || $transaction->status !== 'pending' || $approval->status !== 'pending') {
            return response()->json([
                'message' => 'Transaction is not awaiting approval',
            ], 422);
        }

        if (! $this->canApproveTransfer($user, (int) $transaction->from_account_id)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $transaction->update([
            'status' => 'rejected',
        ]);

        $approval->update([
            'status' => 'rejected',
        ]);

        BankNotification::query()->create([
            'user_id' => (int) $transaction->initiator_user_id,
            'type' => 'transaction',
            'title' => 'Maksajums noraidits',
            'message' => 'Maksajums tika noraidits. Ref: '.$transaction->reference,
            'is_read' => false,
            'sent_at' => now(),
        ]);

        $this->writeAudit(
            $request,
            'transaction.rejected',
            'transaction',
            $transaction->id,
            [
                'approval_id' => $approval->id,
                'rejected_by' => $user->id,
            ]
        );

        return response()->json([
            'message' => 'Transaction rejected',
            'transaction' => $transaction->fresh()->load('approval'),
        ]);
    }

    
    public function show(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user()->loadMissing('role');
        $accessibleAccountIds = $this->accessibleAccountIds($user);

        if (! $user->isAdmin()) {
            $hasAccess = in_array((int) $transaction->from_account_id, $accessibleAccountIds, true)
                || in_array((int) $transaction->to_account_id, $accessibleAccountIds, true);

            if (! $hasAccess) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        $transaction->load([
            'fromAccount:id,iban,name',
            'toAccount:id,iban,name',
            'initiator:id,name,email',
            'approval',
        ]);

        return response()->json([
            'transaction' => $transaction,
        ]);
    }

    
    public function update(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        if (! $user->isAdmin() && $transaction->initiator_user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'category' => ['sometimes', 'in:transfer,salary,utilities,shopping,other'],
            'status' => ['sometimes', 'in:pending,completed,rejected,failed'],
        ]);

        if (array_key_exists('status', $validated) && ! $user->isAdmin()) {
            return response()->json([
                'message' => 'Only admin can change transaction status',
            ], 403);
        }

        if (array_key_exists('status', $validated) && $transaction->status === 'completed' && $validated['status'] !== 'completed') {
            return response()->json([
                'message' => 'Completed transaction status cannot be downgraded',
            ], 422);
        }

        $transaction->update($validated);

        $this->writeAudit(
            $request,
            'transaction.updated',
            'transaction',
            $transaction->id,
            [
                'changes' => $transaction->getChanges(),
            ]
        );

        return response()->json([
            'message' => 'Transaction updated',
            'transaction' => $transaction->fresh(),
        ]);
    }

   
    public function destroy(Request $request, Transaction $transaction): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        if (! $user->isAdmin() && $transaction->initiator_user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($transaction->status === 'completed') {
            return response()->json([
                'message' => 'Completed transaction cannot be deleted',
            ], 422);
        }

        $transaction->delete();

        $this->writeAudit(
            $request,
            'transaction.deleted',
            'transaction',
            $transaction->id,
            [
                'reference' => $transaction->reference,
                'status' => $transaction->status,
            ]
        );

        return response()->json([
            'message' => 'Transaction deleted',
        ]);
    }

   
    public function recipients(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('role');
        $accessibleAccountIds = $this->accessibleAccountIds($user);
        $limit = min((int) $request->query('limit', 200), 500);

        $accounts = Account::query()
            ->select(['id', 'owner_user_id', 'name', 'iban', 'currency', 'status'])
            ->with(['owner:id,name'])
            ->where('status', 'active')
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = (string) $request->query('q');

                $query->where(function ($subQuery) use ($q) {
                    $subQuery->where('name', 'like', "%{$q}%")
                        ->orWhere('iban', 'like', "%{$q}%")
                        ->orWhereHas('owner', function ($ownerQuery) use ($q) {
                            $ownerQuery->where('name', 'like', "%{$q}%");
                        });
                });
            })
            ->orderBy('name')
            ->limit($limit)
            ->get();

        $recipients = $accounts
            ->map(function (Account $account) use ($accessibleAccountIds) {
                return [
                    'id' => $account->id,
                    'name' => $account->name,
                    'iban' => $account->iban,
                    'currency' => $account->currency,
                    'owner_name' => $account->owner?->name,
                    'is_accessible' => in_array((int) $account->id, $accessibleAccountIds, true),
                ];
            })
            ->sortByDesc('is_accessible')
            ->values();

        return response()->json([
            'recipients' => $recipients,
        ]);
    }

    
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('role');
        $accessibleAccountIds = $this->accessibleAccountIds($user);

        $baseQuery = Transaction::query();

        if (! $user->isAdmin()) {
            $baseQuery->where(function ($query) use ($accessibleAccountIds) {
                $query->whereIn('from_account_id', $accessibleAccountIds)
                    ->orWhereIn('to_account_id', $accessibleAccountIds);
            });
        }

        $rows = (clone $baseQuery)
            ->orderBy('created_at')
            ->get(['from_account_id', 'to_account_id', 'amount', 'category', 'status', 'created_at']);

        $inflow = 0.0;
        $outflow = 0.0;
        $monthly = [];
        $monthlyActivity = [];
        $recentActivity = [];
        $byCategory = [];
        $byStatus = [];

        foreach ($rows as $row) {
            $monthKey = $row->created_at->format('Y-m');
            $monthly[$monthKey] = $monthly[$monthKey] ?? 0.0;

            $amount = (float) $row->amount;
            $isIncoming = in_array((int) $row->to_account_id, $accessibleAccountIds, true);
            $isOutgoing = in_array((int) $row->from_account_id, $accessibleAccountIds, true);

            $status = (string) $row->status;
            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;

            // Monthly trend reflects approved (completed) transactions only.
            if ($status === 'completed') {
                if ($isIncoming) {
                    $monthly[$monthKey] += $amount;
                }

                if ($isOutgoing) {
                    $monthly[$monthKey] -= $amount;
                }

                if ($isIncoming || $isOutgoing) {
                    $monthlyActivity[$monthKey] = ($monthlyActivity[$monthKey] ?? 0.0) + $amount;
                    $recentActivity[$row->created_at->toIso8601String()] = ($recentActivity[$row->created_at->toIso8601String()] ?? 0.0) + $amount;
                }
            }

 
            if ($status !== 'completed') {
                continue;
            }

            if ($isIncoming) {
                $inflow += $amount;
            }

            if ($isOutgoing) {
                $outflow += $amount;
                $category = (string) $row->category;
                $byCategory[$category] = ($byCategory[$category] ?? 0.0) + $amount;
            }
        }

        ksort($monthly);
    ksort($monthlyActivity);
        arsort($byCategory);

        return response()->json([
            'totals' => [
                'inflow' => round($inflow, 2),
                'outflow' => round($outflow, 2),
                'net' => round($inflow - $outflow, 2),
            ],
            'monthly_net' => $monthly,
            'monthly_activity' => $monthlyActivity,
            'recent_activity' => array_slice($recentActivity, -12, null, true),
            'outgoing_by_category' => $byCategory,
            'transactions_by_status' => $byStatus,
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

    
    private function canApproveTransfer($user, int $fromAccountId): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $isOwner = Account::query()
            ->whereKey($fromAccountId)
            ->where('owner_user_id', $user->id)
            ->exists();

        if ($isOwner) {
            return true;
        }

        return AccountMember::query()
            ->where('account_id', $fromAccountId)
            ->where('user_id', $user->id)
            ->whereIn('member_role', ['operator', 'approver'])
            ->exists();
    }

   
    private function notifyApprovalPending(Transaction $transaction, Account $fromAccount, float $amount): void
    {
        $initiatorId = (int) $transaction->initiator_user_id;

        BankNotification::query()->create([
            'user_id' => $initiatorId,
            'type' => 'approval',
            'title' => 'Maksajums gaida apstiprinajumu',
            'message' => 'Maksajums '.$amount.' '.$transaction->currency.' gaida apstiprinajumu. Ref: '.$transaction->reference,
            'is_read' => false,
            'sent_at' => now(),
        ]);

        $recipientIds = [];

        if ((int) $fromAccount->owner_user_id !== $initiatorId) {
            $recipientIds[] = (int) $fromAccount->owner_user_id;
        }

        $approverIds = AccountMember::query()
            ->where('account_id', $fromAccount->id)
            ->whereIn('member_role', ['operator', 'approver'])
            ->pluck('user_id')
            ->all();

        $recipientIds = array_values(array_unique(array_merge($recipientIds, array_map('intval', $approverIds))));

        foreach ($recipientIds as $recipientId) {
            BankNotification::query()->create([
                'user_id' => $recipientId,
                'type' => 'approval',
                'title' => 'Nepieciesams apstiprinajums',
                'message' => 'Jauns maksajums '.$amount.' '.$transaction->currency.' gaida apstiprinajumu. Ref: '.$transaction->reference,
                'is_read' => false,
                'sent_at' => now(),
            ]);
        }
    }
}
