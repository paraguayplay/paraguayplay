<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventLink;
use App\Models\User;
use App\Services\PlayPayloadCipher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PlayTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: string, 1: string} token, session_key */
    private function loginAs(User $user): array
    {
        $res = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password', 'device_name' => 'TV'])->assertOk();

        return [$res->json('token'), $res->json('session_key')];
    }

    private function decrypt($res, string $sessionKey): array
    {
        return PlayPayloadCipher::decrypt($res->json('payload'), $res->json('iv'), base64_decode($sessionKey));
    }

    public function test_play_response_is_encrypted(): void
    {
        $link = EventLink::factory()->create(['url' => 'https://cdn.prov.example/secreto/index.m3u8']);
        [$token, $key] = $this->loginAs(User::factory()->active()->create());

        $res = $this->withToken($token)->getJson("/api/events/{$link->event_id}/play")->assertOk();
        $this->assertStringNotContainsString('secreto', $res->getContent());
        $this->assertSame('https://cdn.prov.example/secreto/index.m3u8', $this->decrypt($res, $key)['links'][0]['url']);
    }

    public function test_play_is_logged(): void
    {
        $link = EventLink::factory()->create();
        $user = User::factory()->active()->create();
        [$token] = $this->loginAs($user);
        $this->withToken($token)->withServerVariables(['REMOTE_ADDR' => '181.1.2.3'])
            ->getJson("/api/events/{$link->event_id}/play")->assertOk();

        $log = DB::table('play_logs')->first();
        $this->assertSame($user->id, $log->user_id);
        $this->assertSame($link->event_id, $log->event_id);
        $this->assertSame('181.1.2.3', $log->ip);
        $this->assertNotNull($log->token_id);
    }

    public function test_active_user_gets_links_in_order(): void
    {
        $event = Event::factory()->create(['title' => 'Partido']);
        EventLink::factory()->create(['event_id' => $event->id, 'label' => 'B', 'sort_order' => 2]);
        EventLink::factory()->create(['event_id' => $event->id, 'label' => 'A', 'sort_order' => 1, 'type' => 'dash',
            'drm_type' => 'clearkey', 'drm_clearkeys' => ['kid1' => 'key1'], 'headers' => ['Referer' => 'https://r.example/']]);
        [$token, $key] = $this->loginAs(User::factory()->active()->create());

        $res = $this->withToken($token)->getJson("/api/events/{$event->id}/play")->assertOk()->assertJsonPath('event.title', 'Partido');
        $links = $this->decrypt($res, $key)['links'];
        $this->assertSame(['A', 'B'], array_column($links, 'label'));
        $this->assertSame(['type' => 'clearkey', 'clearkeys' => ['kid1' => 'key1'], 'license_url' => null], $links[0]['drm']);
        $this->assertSame(['Referer' => 'https://r.example/'], $links[0]['headers']);
        $this->assertSame('dash', $links[0]['type']);
    }

    public function test_expired_user_cannot_play(): void
    {
        $user = User::factory()->active()->create();
        $link = EventLink::factory()->create();
        [$token] = $this->loginAs($user);
        $user->update(['expires_at' => now()->subDay()]);

        $this->withToken($token)->getJson("/api/events/{$link->event_id}/play")
            ->assertForbidden()->assertJsonPath('code', 'subscription_inactive');
    }

    public function test_proxy_link_returns_signed_url(): void
    {
        $link = EventLink::factory()->create(['use_proxy' => true, 'url' => 'https://cdn.prov.example/x/index.m3u8']);
        [$token, $key] = $this->loginAs(User::factory()->active()->create());
        $res = $this->withToken($token)->getJson("/api/events/{$link->event_id}/play");
        $url = $this->decrypt($res, $key)['links'][0]['url'];
        $this->assertStringStartsWith(config('app.url').'/api/proxy/manifest?', $url);
        $this->assertStringNotContainsString('cdn.prov.example', $url);
    }

    public function test_hidden_event_returns_404(): void
    {
        $link = EventLink::factory()->create();
        [$token] = $this->loginAs(User::factory()->active()->create());
        $this->withToken($token)->getJson("/api/events/{$link->event_id}/play")->assertOk();
        $link->event->update(['is_visible' => false]);
        $this->withToken($token)->getJson("/api/events/{$link->event_id}/play")->assertNotFound();
    }
}
