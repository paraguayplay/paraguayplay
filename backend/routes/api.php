<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\PlayController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\PlanRequestController;
use App\Http\Controllers\PublicSettingsController;
use App\Http\Controllers\Admin;
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

    Route::middleware('subscribed')->group(function () {
        Route::get('catalog', [CatalogController::class, 'index']);
        Route::get('events/{id}/play', [PlayController::class, 'show'])->middleware('throttle:30,1');
    });
});

Route::prefix('admin')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('users', [Admin\UserController::class, 'index']);
    Route::get('users/{user}', [Admin\UserController::class, 'show']);
    Route::patch('users/{user}', [Admin\UserController::class, 'update']);
    Route::delete('users/{user}/sessions', [Admin\UserController::class, 'destroySessions']);

    Route::get('plan-requests', [Admin\PlanRequestController::class, 'index']);
    Route::get('plan-requests/pending-count', [Admin\PlanRequestController::class, 'pendingCount']);
    Route::get('plan-requests/{planRequest}/preview', [Admin\PlanRequestController::class, 'preview']);
    Route::post('plan-requests/{id}/approve', [Admin\PlanRequestController::class, 'approve']);
    Route::post('plan-requests/{id}/reject', [Admin\PlanRequestController::class, 'reject']);

    Route::apiResource('plans', Admin\PlanController::class)->except('show');

    Route::apiResource('events', Admin\EventController::class);
    Route::put('events/{event}/links', [Admin\EventLinkController::class, 'update']);
    Route::post('uploads/image', [Admin\UploadController::class, 'image']);

    Route::get('settings', [Admin\SettingsController::class, 'show']);
    Route::put('settings', [Admin\SettingsController::class, 'update']);
});
