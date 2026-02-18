<?php

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

Route::middleware('api')->group(function () {
    // Your API routes go here
});
