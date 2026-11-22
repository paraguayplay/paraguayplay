<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsersTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
    }

    public function test_non_admin_gets_403(): void
    {
        $user = User::factory()->active()->create();
        $this->actingAs($user, 'sanctum')->getJson('/api/admin/users')
            ->assertForbidden()->assertJsonPath('code', 'forbidden');
    }

    public function test_guest_gets_401(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_filter_pending(): void
    {
        User::factory()->count(2)->create();
        User::factory()->active()->create();
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users?status=pending')
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_filter_expired_and_search(): void
    {
        User::factory()->expired()->create(['name' => 'Carlos Vencido']);
        User::factory()->active()->create(['name' => 'Carlos Activo']);
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users?status=expired')
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Carlos Vencido');
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users?q=carlos')
            ->assertJsonCount(2, 'data');
    }

    public function test_filter_expiring_in_3_days(): void
    {
        User::factory()->active(2)->create(['name' => 'Pronto']);
        User::factory()->active(10)->create(['name' => 'Lejos']);
        User::factory()->expired()->create(['name' => 'Ya vencido']);
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/users?expiring_days=3')
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Pronto');
    }

    public function test_admin_accepts_user_with_date(): void
    {
        $user = User::factory()->create();
        $this->actingAs($this->admin, 'sanctum')->patchJson("/api/admin/users/{$user->id}", [
            'status' => 'active', 'expires_at' => '2027-01-15T23:59:00', 'admin_notes' => 'Pagó por transferencia',
        ])->assertOk()->assertJsonPath('status', 'active')->assertJsonPath('admin_notes', 'Pagó por transferencia');

        $this->app['auth']->forgetGuards();
        $this->actingAs($user->fresh(), 'sanctum')->getJson('/api/me')
            ->assertJsonPath('subscription.status', 'active')
            ->assertJsonPath('subscription.expires_at', '2027-01-15T23:59:00-03:00');
    }

    public function test_activate_without_date_fails(): void
    {
        $user = User::factory()->create();
        $this->actingAs($this->admin, 'sanctum')->patchJson("/api/admin/users/{$user->id}", ['status' => 'active'])
            ->assertStatus(422)->assertJsonPath('code', 'expires_at_required');
    }

    public function test_kick_sessions(): void
    {
        $user = User::factory()->active()->create();
        $user->createToken('celu');
        $this->actingAs($this->admin, 'sanctum')->getJson("/api/admin/users?q={$user->email}")
            ->assertJsonPath('data.0.active_device', 'celu');
        $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/admin/users/{$user->id}/sessions")->assertNoContent();
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_create_admin_command(): void
    {
        $this->artisan('ppt:create-admin', ['email' => ' Dueno@Mail.com ', 'name' => 'Dueño'])
            ->expectsQuestion('Contraseña (mínimo 8 caracteres)', 'claveSegura1')
            ->assertSuccessful();
        $u = User::where('email', 'dueno@mail.com')->first();
        $this->assertTrue($u->isAdmin());
        $this->assertSame('active', $u->status);
    }
}
