<?php

namespace Database\Factories;

use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PlanRequest> */
class PlanRequestFactory extends Factory
{
    public function definition(): array
    {
        $plan = Plan::factory();

        return [
            'user_id' => User::factory(),
            'plan_id' => $plan,
            'amount_gs' => 20000,
            'status' => 'pending',
        ];
    }
}
