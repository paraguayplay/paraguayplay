<?php

namespace Tests\Feature\Admin;

use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PlanRequestsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-12-01 10:00:00');
        $this->admin = User::factory()->admin()->create();
    }

    private function request(User $user, int $days = 30): PlanRequest
    {
        $plan = Plan::factory()->create(['duration_days' => $days]);

        return PlanRequest::factory()->create(['user_id' => $user->id, 'plan_id' => $plan->id, 'amount_gs' => $plan->price_gs]);
    }

    public function test_approve_new_user_sets_expiry_from_now(): void
    {
        $user = User::factory()->create();
        $req = $this->request($user, 7);
        $this->actingAs($this->admin, 'sanctum')->getJson("/api/admin/plan-requests/{$req->id}/preview")
            ->assertJsonPath('suggested_expires_at', '2026-12-08T10:00:00-03:00');
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/plan-requests/{$req->id}/approve")
            ->assertOk()->assertJsonPath('status', 'active');

        $user->refresh();
        $this->assertSame('active', $user->status);
        $this->assertSame($req->plan_id, $user->plan_id);
        $this->assertEquals(Carbon::parse('2026-12-08 10:00:00'), $user->expires_at);
        $this->assertSame('approved', $req->fresh()->status);
        $this->assertEquals(Carbon::parse('2026-12-08 10:00:00'), $req->fresh()->resulting_expires_at);
    }

    public function test_approve_renewal_adds_to_current_expiry(): void
    {
        $user = User::factory()->create(['status' => 'active', 'expires_at' => '2026-12-05 10:00:00']);
        $req = $this->request($user, 30);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/plan-requests/{$req->id}/approve")->assertOk();
        $this->assertEquals(Carbon::parse('2027-01-04 10:00:00'), $user->fresh()->expires_at);
    }

    public function test_approve_with_custom_date(): void
    {
        $user = User::factory()->create();
        $req = $this->request($user);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/plan-requests/{$req->id}/approve", ['expires_at' => '2027-02-01T23:59:00'])->assertOk();
        $this->assertEquals(Carbon::parse('2027-02-01 23:59:00'), $user->fresh()->expires_at);
    }

    public function test_approving_twice_does_not_extend_twice(): void
    {
        $user = User::factory()->create();
        $req = $this->request($user, 30);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/plan-requests/{$req->id}/approve")->assertOk();
        $after = $user->fresh()->expires_at;
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/plan-requests/{$req->id}/approve")
            ->assertStatus(409)->assertJsonPath('code', 'already_reviewed');
        $this->assertEquals($after, $user->fresh()->expires_at);
    }

    public function test_reject_with_note(): void
    {
        $user = User::factory()->create();
        $req = $this->request($user);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/plan-requests/{$req->id}/reject", ['note' => 'Comprobante ilegible'])->assertOk();
        $this->assertSame('rejected', $req->fresh()->status);
        $this->assertSame('Comprobante ilegible', $req->fresh()->note);
        $this->assertSame('pending', $user->fresh()->status);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/plan-requests/{$req->id}/reject", ['note' => 'x'])->assertStatus(409);
    }

    public function test_pending_count_and_list(): void
    {
        $this->request(User::factory()->create());
        $this->request(User::factory()->create());
        $done = $this->request(User::factory()->create());
        $done->update(['status' => 'approved']);
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/plan-requests/pending-count')->assertExactJson(['count' => 2]);
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/plan-requests?status=pending')
            ->assertJsonCount(2, 'data')->assertJsonStructure(['data' => [['id', 'user' => ['name', 'email', 'phone'], 'plan' => ['name']]]]);
    }
}
