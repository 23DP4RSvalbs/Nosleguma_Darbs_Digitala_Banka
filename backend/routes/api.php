<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/test', function () {
    return response()->json(['message' => 'Laravel connected!']);
});


Route::middleware('api')->group(function () {
    // Your API routes go here
});
