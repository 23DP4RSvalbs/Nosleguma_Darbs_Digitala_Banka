<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBankingProfileReady
{
    public function handle(Request $request, Closure $next): Response|JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated',
            ], 401);
        }

        $user->loadMissing('role');

        if ($user->isAdmin()) {
            return $next($request);
        }

        if ($user->status === 'blocked') {
            return response()->json([
                'message' => 'Konts ir bloķēts. Sazinies ar administratoru.',
            ], 403);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Konts gaida administratora apstiprinājumu.',
            ], 403);
        }

        if (! $user->hasCompleteProfile()) {
            return response()->json([
                'message' => 'Aizpildi profila iestatījumus, lai turpinātu.',
            ], 403);
        }

        return $next($request);
    }
}
