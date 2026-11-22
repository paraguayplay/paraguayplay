<?php

namespace Database\Factories;

use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Plan> */
class PlanFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => 'Mensual', 'price_gs' => 20000, 'duration_days' => 30, 'is_active' => true, 'sort_order' => 2];
    }
}
