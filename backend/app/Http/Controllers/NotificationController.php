<?php

namespace App\Http\Controllers;

use App\Models\BankNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['nullable', 'string', 'max:32'],
            'is_read' => ['nullable', 'boolean'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $request->user()
            ->bankNotifications()
            ->latest('created_at');

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        if (array_key_exists('is_read', $validated)) {
            $query->where('is_read', (bool) $validated['is_read']);
        }

        if (! empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }

        if (! empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        $notifications = $query->paginate((int) ($validated['per_page'] ?? 20));
        $unreadCount = $request->user()->bankNotifications()->where('is_read', false)->count();

        return response()->json([
            'notifications' => $notifications,
            'meta' => [
                'unread_count' => $unreadCount,
            ],
        ]);
    }

   
    public function show(Request $request, BankNotification $notification): JsonResponse
    {
        if ((int) $notification->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'notification' => $notification,
        ]);
    }

    
    public function markRead(Request $request, BankNotification $notification): JsonResponse
    {
        if ((int) $notification->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if (! $notification->is_read) {
            $notification->update(['is_read' => true]);

            $this->writeAudit(
                $request,
                'notification.read',
                'bank_notification',
                $notification->id,
                [
                    'type' => $notification->type,
                ]
            );
        }

        return response()->json([
            'message' => 'Notification marked as read',
            'notification' => $notification->fresh(),
        ]);
    }

   
    public function markAllRead(Request $request): JsonResponse
    {
        $updated = $request->user()
            ->bankNotifications()
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $this->writeAudit(
            $request,
            'notification.read_all',
            'bank_notification',
            null,
            [
                'updated_count' => $updated,
            ]
        );

        return response()->json([
            'message' => 'Notifications marked as read',
            'updated_count' => $updated,
        ]);
    }
}
