<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PlanRequestController;
use App\Http\Controllers\PublicSettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true]);

Route::get('/plans', [PlanController::class, 'index']);
Route::get('/settings/public', [PublicSettingsController::class, 'show']);

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:5,1');
    Route::post('reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:10,1');
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('me', [MeController::class, 'show']);
    Route::put('me/password', [MeController::class, 'updatePassword']);
    Route::get('plan-requests', [PlanRequestController::class, 'index']);
    Route::post('plan-requests', [PlanRequestController::class, 'store'])->middleware('throttle:10,1');
});
