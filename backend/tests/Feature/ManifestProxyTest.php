<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ProxyUrlSigner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ManifestProxyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // DNS falso: los dominios de prueba resuelven a una IP pública.
        $this->app->instance(\App\Services\SafeHost::class, new \App\Services\SafeHost(fn () => ['93.184.216.34']));
    }

    /** @return array{0: User, 1: int} */
    private function makeSession(): array
    {
        $user = User::factory()->active()->create();
        $token = $user->createToken('TV');

        return [$user, $token->accessToken->id];
    }

    private function path(string $signed): string
    {
        return substr($signed, strlen(config('app.url')));
    }

    public function test_valid_signature_returns_rewritten_manifest_with_cors(): void
    {
        Http::fake(['origen.example/*' => Http::response("#EXTM3U\n#EXTINF:6,\nseg1.ts\n", 200, ['Content-Type' => 'application/vnd.apple.mpegurl'])]);
        [$user, $tokenId] = $this->makeSession();
        $signed = ProxyUrlSigner::sign('https://origen.example/live/index.m3u8', 600, $user->id, $tokenId);

        $res = $this->get($this->path($signed))->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', '*')
            ->assertHeader('Content-Type', 'application/vnd.apple.mpegurl');
        $this->assertStringContainsString('https://origen.example/live/seg1.ts', $res->getContent());
        $this->assertStringContainsString('no-store', $res->headers->get('Cache-Control'));
    }

    public function test_nested_playlists_are_signed_for_same_session(): void
    {
        Http::fake(['origen.example/*' => Http::response("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nlow/index.m3u8\n")]);
        [$user, $tokenId] = $this->makeSession();
        $signed = ProxyUrlSigner::sign('https://origen.example/live/master.m3u8', 600, $user->id, $tokenId);

        $body = $this->get($this->path($signed))->assertOk()->getContent();
        $nested = trim(explode("\n", trim($body))[2]);
        parse_str(parse_url($nested, PHP_URL_QUERY), $q);
        $this->assertSame(
            ['url' => 'https://origen.example/live/low/index.m3u8', 'user_id' => $user->id, 'token_id' => $tokenId],
            ProxyUrlSigner::verify($q),
        );
    }

    public function test_proxy_refuses_private_hosts(): void
    {
        Http::fake();
        [$user, $tokenId] = $this->makeSession();
        foreach (['http://127.0.0.1/x.m3u8', 'http://192.168.1.5/x.m3u8', 'http://localhost/x.m3u8', 'http://10.0.0.1/x.m3u8', 'file:///etc/passwd'] as $url) {
            $this->get($this->path(ProxyUrlSigner::sign($url, 600, $user->id, $tokenId)))
                ->assertForbidden()->assertJsonPath('code', 'forbidden_host');
        }
        Http::assertNothingSent();
    }

    public function test_tampered_signature_returns_403(): void
    {
        Http::fake();
        [$user, $tokenId] = $this->makeSession();
        $signed = ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $user->id, $tokenId);
        $this->get($this->path($signed).'0')->assertForbidden()->assertJsonPath('code', 'invalid_signature');
        Http::assertNothingSent();
    }

    public function test_proxy_url_dies_with_session(): void
    {
        Http::fake(['origen.example/*' => Http::response("#EXTM3U\n")]);
        $user = User::factory()->active()->create(['password' => 'password']);
        $login = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password', 'device_name' => 'TV']);
        $tokenId = $user->tokens()->first()->id;
        $signed = ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $user->id, $tokenId);
        $this->get($this->path($signed))->assertOk();

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password', 'device_name' => 'Celu', 'force' => true])->assertOk();
        $this->get($this->path($signed))->assertForbidden()->assertJsonPath('code', 'session_ended');
    }

    public function test_expired_user_link_dies(): void
    {
        Http::fake(['origen.example/*' => Http::response("#EXTM3U\n")]);
        [$user, $tokenId] = $this->makeSession();
        $signed = ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $user->id, $tokenId);
        $user->update(['expires_at' => now()->subMinute()]);
        $this->get($this->path($signed))->assertForbidden()->assertJsonPath('code', 'session_ended');
    }

    public function test_link_headers_are_forwarded_to_origin(): void
    {
        Http::fake(['origen.example/*' => Http::response("#EXTM3U\n")]);
        [$user, $tokenId] = $this->makeSession();
        $signed = ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $user->id, $tokenId, ['Referer' => 'https://prov.example/']);
        $this->get($this->path($signed))->assertOk();
        Http::assertSent(fn ($req) => $req->header('Referer') === ['https://prov.example/']);
    }
}
