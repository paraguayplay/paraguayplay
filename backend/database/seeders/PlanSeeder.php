<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            ['name' => 'Semanal', 'price_gs' => 5000, 'duration_days' => 7, 'sort_order' => 1],
            ['name' => 'Mensual', 'price_gs' => 20000, 'duration_days' => 30, 'sort_order' => 2],
            ['name' => 'Anual', 'price_gs' => 240000, 'duration_days' => 365, 'sort_order' => 3],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['name' => $plan['name']], $plan);
        }
    }
}
