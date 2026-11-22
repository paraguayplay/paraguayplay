<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TvLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_flow(): void
    {
        $user = User::factory()->active()->create();
        $phone = $user->createToken('Celular')->plainTextToken;

        $res = $this->postJson('/api/auth/tv-code', ['device_name' => 'TV Sala'])->assertCreated();
        $code = $res->json('code');
        $this->assertMatchesRegularExpression('/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/', $code);
        $this->assertSame(config('app.frontend_url').'/vincular?code='.$code, $res->json('qr_url'));

        $this->getJson("/api/auth/tv-code/{$code}")->assertOk()->assertExactJson(['status' => 'waiting']);

        $this->withToken($phone)->postJson("/api/auth/tv-code/{$code}/confirm")->assertOk()
            ->assertJsonPath('message', 'Listo. Tu TV ya está conectado. Esta sesión del celular se cerró.');
        $this->app['auth']->forgetGuards();

        $approved = $this->getJson("/api/auth/tv-code/{$code}")->assertOk()->assertJsonPath('status', 'approved');
        $tvToken = $approved->json('token');
        $this->assertNotEmpty($approved->json('session_key'));
        $this->assertSame($user->email, $approved->json('user.email'));

        $this->getJson("/api/auth/tv-code/{$code}")->assertStatus(410);

        $this->withToken($tvToken)->getJson('/api/me')->assertOk();
        $this->assertSame(['TV Sala'], $user->tokens()->pluck('name')->all());
    }

    public function test_confirm_logs_out_phone(): void
    {
        $user = User::factory()->active()->create();
        $phone = $user->createToken('Celular')->plainTextToken;
        $code = $this->postJson('/api/auth/tv-code', ['device_name' => 'TV'])->json('code');
        $this->withToken($phone)->postJson("/api/auth/tv-code/{$code}/confirm")->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($phone)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_expired_code_returns_410(): void
    {
        $user = User::factory()->active()->create();
        $code = $this->postJson('/api/auth/tv-code', ['device_name' => 'TV'])->json('code');
        $this->travel(11)->minutes();
        $this->getJson("/api/auth/tv-code/{$code}")->assertStatus(410)->assertJsonPath('code', 'code_expired');
        $this->actingAs($user, 'sanctum')->postJson("/api/auth/tv-code/{$code}/confirm")->assertStatus(410);
    }

    public function test_code_is_case_insensitive_and_unknown_is_410(): void
    {
        $user = User::factory()->active()->create();
        $code = $this->postJson('/api/auth/tv-code', ['device_name' => 'TV'])->json('code');
        $this->actingAs($user, 'sanctum')->postJson('/api/auth/tv-code/'.strtolower($code).'/confirm')->assertOk();
        $this->getJson('/api/auth/tv-code/ZZZZZZ')->assertStatus(410);
    }
}
