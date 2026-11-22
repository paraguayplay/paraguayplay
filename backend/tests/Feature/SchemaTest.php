<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_plan_seeder_creates_three_plans(): void
    {
        $this->seed(PlanSeeder::class);
        $this->seed(PlanSeeder::class); // idempotente

        $plans = Plan::orderBy('sort_order')->get();
        $this->assertSame([5000, 20000, 240000], $plans->pluck('price_gs')->all());
        $this->assertSame([7, 30, 365], $plans->pluck('duration_days')->all());
        $this->assertSame(['Semanal', 'Mensual', 'Anual'], $plans->pluck('name')->all());
    }

    public function test_new_user_is_pending(): void
    {
        $user = User::factory()->create();
        $this->assertSame('pending', $user->fresh()->status);
        $this->assertSame('user', $user->fresh()->role);
    }

    public function test_setting_roundtrip(): void
    {
        Setting::put('apk_url', 'x');
        $this->assertSame('x', Setting::get('apk_url'));
        $this->assertSame('def', Setting::get('missing', 'def'));
    }
}
