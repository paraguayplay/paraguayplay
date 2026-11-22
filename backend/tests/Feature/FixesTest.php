<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FixesTest extends TestCase
{
    use RefreshDatabase;

    public function test_tv_confirm_near_expiry_can_still_be_claimed(): void
    {
        $user = User::factory()->active()->create();
        $code = $this->postJson('/api/auth/tv-code', ['device_name' => 'TV'])->json('code');
        $this->travel(9)->minutes();
        $this->travel(58)->seconds();
        $this->actingAs($user, 'sanctum')->postJson("/api/auth/tv-code/{$code}/confirm")->assertOk();
        $this->travel(5)->seconds();
        $this->getJson("/api/auth/tv-code/{$code}")->assertOk()->assertJsonPath('status', 'approved');
    }

    public function test_unclaimed_approved_code_is_revoked_after_grace(): void
    {
        $user = User::factory()->active()->create();
        $code = $this->postJson('/api/auth/tv-code', ['device_name' => 'TV'])->json('code');
        $this->actingAs($user, 'sanctum')->postJson("/api/auth/tv-code/{$code}/confirm")->assertOk();
        $this->travel(13)->minutes();
        $this->getJson("/api/auth/tv-code/{$code}")->assertStatus(410);
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_validation_messages_are_in_spanish(): void
    {
        User::factory()->create(['email' => 'ana@mail.com']);
        $this->postJson('/api/auth/register', [
            'name' => 'Ana', 'email' => 'ana@mail.com', 'phone' => '0981', 'password' => 'corta', 'password_confirmation' => 'corta', 'device_name' => 'x',
        ])->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Este correo ya está registrado.')
            ->assertJsonPath('errors.password.0', 'La contraseña debe tener al menos 8 caracteres.');
    }

    public function test_admin_can_update_only_event_end(): void
    {
        $admin = User::factory()->admin()->create();
        $event = Event::factory()->create(['starts_at' => now(), 'ends_at' => now()->addHour()]);
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/events/{$event->id}", ['ends_at' => now()->addHours(3)->toIso8601String()])->assertOk();
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/events/{$event->id}", ['ends_at' => now()->subHour()->toIso8601String()])->assertStatus(422);
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/events/{$event->id}", ['starts_at' => now()->addHours(5)->toIso8601String()])->assertStatus(422);
    }
}
