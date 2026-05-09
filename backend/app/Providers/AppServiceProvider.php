<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
  
    public function register(): void
    {
        //
    }

  
    public function boot(): void
    {
        $disableRateLimiting = (bool) env('DISABLE_RATE_LIMITING', false);

        RateLimiter::for('auth-register', function (Request $request) use ($disableRateLimiting) {
            $ipKey = (string) $request->ip();

            $limit = $disableRateLimiting ? 10000 : 3;

            return [
                Limit::perMinute($limit)->by($ipKey),
            ];
        });

        RateLimiter::for('auth-login', function (Request $request) use ($disableRateLimiting) {
            $emailKey = Str::lower((string) $request->input('email'));
            $ipKey = (string) $request->ip();

            $limit = $disableRateLimiting ? 10000 : 5;

            return [
                Limit::perMinute($limit)->by($emailKey.'|'.$ipKey),
            ];
        });

        RateLimiter::for('api-write', function (Request $request) use ($disableRateLimiting) {
            $userKey = $request->user()?->getAuthIdentifier();
            $ipKey = (string) $request->ip();

            $limit = $disableRateLimiting ? 10000 : 60;

            return [
                Limit::perMinute($limit)->by(($userKey !== null ? (string) $userKey : 'guest').'|'.$ipKey),
            ];
        });

        RateLimiter::for('transaction-action', function (Request $request) use ($disableRateLimiting) {
            $userKey = $request->user()?->getAuthIdentifier();
            $ipKey = (string) $request->ip();

            $limit = $disableRateLimiting ? 10000 : 20;

            return [
                Limit::perMinute($limit)->by(($userKey !== null ? (string) $userKey : 'guest').'|'.$ipKey),
            ];
        });
    }
}
