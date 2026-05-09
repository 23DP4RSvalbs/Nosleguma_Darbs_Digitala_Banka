<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/login', function () {
    if (request()->expectsJson()) {
        return response()->json([
            'message' => 'Unauthenticated.',
        ], 401);
    }

    return redirect()->to(config('app.frontend_url'));
})->name('login');
