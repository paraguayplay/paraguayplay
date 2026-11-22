<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\PlanRequest;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
        Setting::put('support_whatsapp', '595981123456');
    }

    private function monthly(): Plan
    {
        return Plan::where('name', 'Mensual')->first();
    }

    public function test_plans_are_public_and_ordered(): void
    {
        Plan::where('name', 'Anual')->update(['is_active' => false]);
        $this->getJson('/api/plans')->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.name', 'Semanal')
            ->assertJsonPath('0.price_label', 'Gs 5.000')
            ->assertJsonPath('1.duration_days', 30);
    }

    public function test_pending_user_can_request_plan(): void
    {
        $user = User::factory()->create(['name' => 'Ana', 'email' => 'ana@mail.com']);
        $res = $this->actingAs($user, 'sanctum')->postJson('/api/plan-requests', ['plan_id' => $this->monthly()->id])
            ->assertCreated()
            ->assertJsonPath('request.amount_gs', 20000)
            ->assertJsonPath('request.status', 'pending')
            ->assertJsonPath('request.plan.name', 'Mensual');

        $id = $res->json('request.id');
        $url = $res->json('whatsapp_url');
        $this->assertStringStartsWith('https://wa.me/595981123456?text=', $url);
        $text = urldecode(substr($url, strlen('https://wa.me/595981123456?text=')));
        $this->assertSame(
            "Hola, envío el comprobante de pago de PARAGUAY PLAY TV.\nNombre: Ana\nCorreo: ana@mail.com\nPlan: Mensual (Gs 20.000)\nSolicitud N.º {$id}",
            $text,
        );
    }

    public function test_new_request_cancels_previous_pending(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->postJson('/api/plan-requests', ['plan_id' => $this->monthly()->id])->assertCreated();
        $weekly = Plan::where('name', 'Semanal')->first();
        $this->actingAs($user, 'sanctum')->postJson('/api/plan-requests', ['plan_id' => $weekly->id])->assertCreated();

        $this->assertSame(['cancelled', 'pending'], PlanRequest::orderBy('id')->pluck('status')->all());
        $this->actingAs($user, 'sanctum')->getJson('/api/plan-requests')->assertOk()
            ->assertJsonCount(2)->assertJsonPath('0.plan.name', 'Semanal');
    }

    public function test_suspended_user_cannot_request(): void
    {
        $user = User::factory()->suspended()->create();
        $this->actingAs($user, 'sanctum')->postJson('/api/plan-requests', ['plan_id' => $this->monthly()->id])
            ->assertForbidden()->assertJsonPath('code', 'account_suspended');
    }

    public function test_inactive_plan_cannot_be_requested(): void
    {
        $user = User::factory()->create();
        $plan = $this->monthly();
        $plan->update(['is_active' => false]);
        $this->actingAs($user, 'sanctum')->postJson('/api/plan-requests', ['plan_id' => $plan->id])->assertStatus(422);
    }

    public function test_me_shows_pending_request(): void
    {
        $user = User::factory()->active(3)->create();
        $id = $this->actingAs($user, 'sanctum')->postJson('/api/plan-requests', ['plan_id' => $this->monthly()->id])->json('request.id');
        $this->actingAs($user, 'sanctum')->getJson('/api/me')
            ->assertJsonPath('pending_request.id', $id)
            ->assertJsonPath('pending_request.amount_gs', 20000)
            ->assertJsonPath('subscription.status', 'active');
    }

    public function test_public_settings(): void
    {
        Setting::put('bank_info', "Banco X\nCuenta 123");
        $this->getJson('/api/settings/public')->assertOk()
            ->assertExactJson([
                'bank_info' => "Banco X\nCuenta 123",
                'support_whatsapp' => '595981123456',
                'help_text' => null,
                'apk_url' => null,
            ]);
    }
}
