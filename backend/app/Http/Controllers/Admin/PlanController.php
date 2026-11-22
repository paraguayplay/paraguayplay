<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\User;
use App\Support\ApiError;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    private const RULES = [
        'name' => ['string', 'max:50'],
        'price_gs' => ['integer', 'min:0'],
        'duration_days' => ['integer', 'min:1', 'max:3650'],
        'is_active' => ['boolean'],
        'sort_order' => ['integer'],
    ];

    public function index()
    {
        return PlanResource::collection(Plan::orderBy('sort_order')->orderBy('id')->get());
    }

    public function store(Request $request)
    {
        $rules = self::RULES;
        foreach (['name', 'price_gs', 'duration_days'] as $k) {
            array_unshift($rules[$k], 'required');
        }

        return (new PlanResource(Plan::create($request->validate($rules))))->response()->setStatusCode(201);
    }

    public function update(Request $request, Plan $plan)
    {
        $rules = array_map(fn ($r) => array_merge(['sometimes'], $r), self::RULES);
        $plan->update($request->validate($rules));

        return new PlanResource($plan);
    }

    public function destroy(Plan $plan)
    {
        $used = PlanRequest::where('plan_id', $plan->id)->exists() || User::where('plan_id', $plan->id)->exists();
        if ($used) {
            $plan->update(['is_active' => false]);

            return ApiError::make('plan_in_use', 'Este plan ya tiene solicitudes o usuarios; se desactivó en lugar de borrarlo.', 409);
        }
        $plan->delete();

        return response()->noContent();
    }
}
