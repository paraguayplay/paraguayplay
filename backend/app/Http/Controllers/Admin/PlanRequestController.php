<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Http\Resources\PlanRequestResource;
use App\Models\PlanRequest;
use App\Models\User;
use App\Services\SubscriptionService;
use App\Support\ApiError;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PlanRequestController extends Controller
{
    public function __construct(private SubscriptionService $subs) {}

    public function index(Request $request)
    {
        $request->validate(['status' => ['nullable', 'in:pending,approved,rejected,cancelled']]);

        $page = PlanRequest::with(['plan', 'user'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByRaw("case when status = 'pending' then 0 else 1 end")
            ->orderByDesc('id')
            ->paginate(25);

        $page->getCollection()->transform(fn (PlanRequest $r) => array_merge(
            (new PlanRequestResource($r))->resolve(),
            ['user' => ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email, 'phone' => $r->user->phone]],
        ));

        return $page;
    }

    public function pendingCount()
    {
        return response()->json(['count' => PlanRequest::where('status', 'pending')->count()]);
    }

    public function preview(PlanRequest $planRequest)
    {
        $expiry = $this->subs->computeExpiry($planRequest->user->expires_at, $planRequest->plan->duration_days, now());

        return response()->json(['suggested_expires_at' => $expiry->toIso8601String()]);
    }

    public function approve(Request $request, int $id)
    {
        $data = $request->validate(['expires_at' => ['nullable', 'date']]);

        return DB::transaction(function () use ($id, $data) {
            $planRequest = PlanRequest::with('plan')->lockForUpdate()->findOrFail($id);
            if ($planRequest->status !== 'pending') {
                return ApiError::make('already_reviewed', 'Esta solicitud ya fue revisada.', 409);
            }

            $user = User::lockForUpdate()->findOrFail($planRequest->user_id);
            $expiry = isset($data['expires_at'])
                ? Carbon::parse($data['expires_at'])
                : $this->subs->computeExpiry($user->expires_at, $planRequest->plan->duration_days, now());

            $user->update(['status' => 'active', 'plan_id' => $planRequest->plan_id, 'expires_at' => $expiry]);
            $planRequest->update(['status' => 'approved', 'resulting_expires_at' => $expiry, 'reviewed_at' => now()]);

            return new AdminUserResource($user->fresh()->load('plan'));
        });
    }

    public function reject(Request $request, int $id)
    {
        $data = $request->validate(['note' => ['nullable', 'string', 'max:255']]);

        return DB::transaction(function () use ($id, $data) {
            $planRequest = PlanRequest::lockForUpdate()->findOrFail($id);
            if ($planRequest->status !== 'pending') {
                return ApiError::make('already_reviewed', 'Esta solicitud ya fue revisada.', 409);
            }
            $planRequest->update(['status' => 'rejected', 'note' => $data['note'] ?? null, 'reviewed_at' => now()]);

            return new PlanRequestResource($planRequest->load('plan'));
        });
    }
}
