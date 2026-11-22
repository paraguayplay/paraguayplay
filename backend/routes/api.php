<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MeController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true]);

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('me', [MeController::class, 'show']);
    Route::put('me/password', [MeController::class, 'updatePassword']);
});
