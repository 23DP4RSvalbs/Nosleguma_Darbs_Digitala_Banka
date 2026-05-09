<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\AccountMemberController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TransactionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/test', function () {
    return response()->json(['message' => 'Laravel connected!']);
});

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'message' => 'Backend is healthy', 'timestamp' => now()]);
});

Route::get('/ping', function () {
    return "pong";
});

Route::prefix('auth')->group(function () {
    // Registration throttling removed for presentation/testing
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::post('/2fa/challenge', [AuthController::class, 'completeTwoFactorChallenge']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::patch('/auth/profile', [AuthController::class, 'updateProfile'])->middleware('throttle:api-write');
    Route::post('/auth/profile-picture', [AuthController::class, 'uploadProfilePicture'])->middleware('throttle:api-write');
    Route::post('/auth/password', [AuthController::class, 'changePassword'])->middleware('throttle:api-write');
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/2fa/setup', [AuthController::class, 'setupTwoFactor']);
    Route::post('/auth/2fa/enable', [AuthController::class, 'enableTwoFactor']);
    Route::get('/auth/2fa/status', [AuthController::class, 'twoFactorStatus']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/{notification}', [NotificationController::class, 'show']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead'])->middleware('throttle:api-write');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->middleware('throttle:api-write');
    Route::apiResource('accounts', AccountController::class)->middleware(['throttle:accounts-write', 'banking.ready']);
    Route::get('/accounts/{account}/members/candidates', [AccountMemberController::class, 'candidates'])->middleware('banking.ready');
    Route::get('/accounts/{account}/members', [AccountMemberController::class, 'index'])->middleware('banking.ready');
    Route::post('/accounts/{account}/members', [AccountMemberController::class, 'store'])->middleware(['throttle:accounts-write', 'banking.ready']);
    Route::put('/accounts/{account}/members/{member}', [AccountMemberController::class, 'update'])->middleware(['throttle:accounts-write', 'banking.ready']);
    Route::patch('/accounts/{account}/members/{member}', [AccountMemberController::class, 'update'])->middleware(['throttle:accounts-write', 'banking.ready']);
    Route::delete('/accounts/{account}/members/{member}', [AccountMemberController::class, 'destroy'])->middleware(['throttle:accounts-write', 'banking.ready']);
    Route::get('/transactions/stats', [TransactionController::class, 'stats'])->middleware('banking.ready');
    Route::get('/transactions/recipients', [TransactionController::class, 'recipients'])->middleware('banking.ready');
    Route::post('/transactions/{transaction}/approve', [TransactionController::class, 'approve'])->middleware(['throttle:approvals-action', 'banking.ready']);
    Route::post('/transactions/{transaction}/reject', [TransactionController::class, 'reject'])->middleware(['throttle:approvals-action', 'banking.ready']);
    Route::apiResource('transactions', TransactionController::class)->middleware(['throttle:transactions-write', 'banking.ready']);

    Route::get('/auth/heartbeat', function (Request $request) {
        return response()->json([
            'authenticated' => true,
            'user_id' => $request->user()->id,
        ]);
    });

    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/metrics', [AdminUserController::class, 'metrics']);
        Route::get('/admin/users', [AdminUserController::class, 'index']);
        Route::get('/admin/roles', [AdminUserController::class, 'roles']);
        Route::patch('/admin/users/{managedUser}', [AdminUserController::class, 'update'])->middleware('throttle:api-write');
    });

    Route::get('/admin/ping', function () {
        return response()->json(['message' => 'Admin access granted']);
    })->middleware('role:admin');
});
