<?php

namespace Tests\Feature\Admin;

use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlansTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_update_and_delete_plans(): void
    {
        $admin = User::factory()->admin()->create();
        $id = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/plans', [
            'name' => 'Quincenal', 'price_gs' => 12000, 'duration_days' => 15, 'is_active' => true, 'sort_order' => 2,
        ])->assertCreated()->json('id');

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/plans/{$id}", ['price_gs' => 10000])
            ->assertOk()->assertJsonPath('price_label', 'Gs 10.000');

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/plans')->assertJsonCount(1);
        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/plans/{$id}")->assertNoContent();
        $this->assertSame(0, Plan::count());
    }

    public function test_deleting_used_plan_returns_409_and_deactivates(): void
    {
        $admin = User::factory()->admin()->create();
        $req = PlanRequest::factory()->create();
        $this->actingAs($admin, 'sanctum')->deleteJson("/api/admin/plans/{$req->plan_id}")
            ->assertStatus(409)->assertJsonPath('code', 'plan_in_use');
        $this->assertFalse(Plan::find($req->plan_id)->is_active);
    }
}
