<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function register(array $over = [])
    {
        return $this->postJson('/api/auth/register', array_merge([
            'name' => 'Juan Pérez',
            'email' => 'juan@mail.com',
            'phone' => '0981123456',
            'password' => 'secreto123',
            'password_confirmation' => 'secreto123',
            'device_name' => 'Celular de Juan',
        ], $over));
    }

    private function login(array $over = [])
    {
        return $this->postJson('/api/auth/login', array_merge([
            'email' => 'juan@mail.com',
            'password' => 'secreto123',
            'device_name' => 'TV sala',
        ], $over));
    }

    public function test_register_returns_token_and_pending_user(): void
    {
        $res = $this->register()->assertCreated();
        $res->assertJsonPath('user.email', 'juan@mail.com')
            ->assertJsonPath('user.subscription.status', 'pending')
            ->assertJsonPath('user.subscription.expires_at', null)
            ->assertJsonPath('user.pending_request', null);
        $this->assertNotEmpty($res->json('token'));
        $this->assertSame(32, strlen(base64_decode($res->json('session_key'))));
        $this->assertSame('pending', User::first()->status);
    }

    public function test_email_is_normalized(): void
    {
        $this->register(['email' => ' Juan@Mail.com '])->assertCreated();
        $this->assertSame('juan@mail.com', User::first()->email);

        $this->login(['email' => 'juan@mail.com', 'force' => true])->assertOk();
        $this->register(['email' => 'JUAN@mail.com'])->assertStatus(422);
        $this->assertSame(1, User::count());
    }

    public function test_login_on_second_device_returns_409(): void
    {
        $this->register()->assertCreated();

        $this->login()->assertStatus(409)
            ->assertJsonPath('code', 'other_device_active')
            ->assertJsonPath('device', 'Celular de Juan');
    }

    public function test_force_login_revokes_previous_device(): void
    {
        $a = $this->register()->json('token');
        $b = $this->login(['force' => true])->assertOk()->json('token');

        $this->app['auth']->forgetGuards();
        $this->withToken($a)->getJson('/api/me')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($b)->getJson('/api/me')->assertOk()->assertJsonPath('email', 'juan@mail.com');
    }

    public function test_wrong_password_returns_invalid_credentials(): void
    {
        $this->register();
        $this->login(['password' => 'otra-clave'])->assertStatus(422)->assertJsonPath('code', 'invalid_credentials');
        $this->login(['email' => 'nadie@mail.com'])->assertStatus(422)->assertJsonPath('code', 'invalid_credentials');
    }

    public function test_admin_can_have_multiple_devices(): void
    {
        User::factory()->admin()->create(['email' => 'admin@mail.com', 'password' => 'secreto123']);
        $this->login(['email' => 'admin@mail.com', 'device_name' => 'PC'])->assertOk();
        $this->login(['email' => 'admin@mail.com', 'device_name' => 'Celu'])->assertOk();
        $this->assertSame(2, User::first()->tokens()->count());
    }

    public function test_logout_revokes_token(): void
    {
        $t = $this->register()->json('token');
        $this->withToken($t)->postJson('/api/auth/logout')->assertNoContent();
        $this->app['auth']->forgetGuards();
        $this->withToken($t)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_change_password_requires_current(): void
    {
        $t = $this->register()->json('token');
        $this->withToken($t)->putJson('/api/me/password', [
            'current_password' => 'mala', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345',
        ])->assertStatus(422);
        $this->withToken($t)->putJson('/api/me/password', [
            'current_password' => 'secreto123', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345',
        ])->assertNoContent();
        $this->login(['password' => 'nueva12345', 'force' => true])->assertOk();
    }

    public function test_me_shows_active_subscription(): void
    {
        $user = User::factory()->active(10)->create();
        $this->actingAs($user, 'sanctum')->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('subscription.status', 'active')
            ->assertJsonPath('subscription.days_left', 10)
            ->assertJsonMissingPath('admin_notes')
            ->assertJsonMissingPath('session_key');
    }
}
