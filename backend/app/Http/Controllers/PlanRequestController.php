<?php

namespace App\Http\Controllers;

use App\Http\Resources\PlanRequestResource;
use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\Setting;
use App\Models\User;
use App\Support\ApiError;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PlanRequestController extends Controller
{
    public function index(Request $request)
    {
        return PlanRequestResource::collection(
            $request->user()->planRequests()->with('plan')->orderByDesc('id')->limit(50)->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->status === 'suspended') {
            return ApiError::make('account_suspended', 'Tu cuenta está suspendida. Contacta a soporte.', 403);
        }

        $data = $request->validate([
            'plan_id' => ['required', Rule::exists('plans', 'id')->where('is_active', true)],
        ]);
        $plan = Plan::findOrFail($data['plan_id']);

        $planRequest = DB::transaction(function () use ($user, $plan) {
            $user->planRequests()->where('status', 'pending')->update(['status' => 'cancelled']);

            return $user->planRequests()->create([
                'plan_id' => $plan->id,
                'amount_gs' => $plan->price_gs,
                'status' => 'pending',
            ]);
        });
        $planRequest->load('plan');

        return response()->json([
            'request' => new PlanRequestResource($planRequest),
            'whatsapp_url' => self::whatsappUrl($user, $planRequest),
        ], 201);
    }

    public static function whatsappUrl(User $user, PlanRequest $planRequest): ?string
    {
        $phone = Setting::get('support_whatsapp');
        if (! $phone) {
            return null;
        }

        $msg = implode("\n", [
            'Hola, envío el comprobante de pago de PARAGUAY PLAY TV.',
            "Nombre: {$user->name}",
            "Correo: {$user->email}",
            "Plan: {$planRequest->plan->name} (".Money::gs($planRequest->amount_gs).')',
            "Solicitud N.º {$planRequest->id}",
        ]);

        return "https://wa.me/{$phone}?text=".rawurlencode($msg);
    }
}
