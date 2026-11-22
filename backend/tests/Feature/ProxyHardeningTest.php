<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ProxyUrlSigner;
use App\Services\SafeHost;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProxyHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->instance(SafeHost::class, new SafeHost(fn () => ['93.184.216.34']));
    }

    /** @return array{0: User, 1: int} */
    private function makeSession(): array
    {
        $user = User::factory()->active()->create();

        return [$user, $user->createToken('TV')->accessToken->id];
    }

    private function path(string $signed): string
    {
        return substr($signed, strlen(config('app.url')));
    }

    public function test_redirect_to_private_host_is_refused(): void
    {
        Http::fake([
            'origen.example/*' => Http::response('', 302, ['Location' => 'http://127.0.0.1/secret']),
            '127.0.0.1/*' => Http::response('SECRET-INTERNAL'),
        ]);
        [$user, $tokenId] = $this->makeSession();
        $res = $this->get($this->path(ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $user->id, $tokenId)));

        $res->assertForbidden()->assertJsonPath('code', 'forbidden_host');
        $this->assertStringNotContainsString('SECRET', $res->getContent());
        Http::assertNotSent(fn ($req) => str_contains($req->url(), '127.0.0.1'));
    }

    public function test_redirect_to_public_host_is_followed(): void
    {
        Http::fake([
            'origen.example/*' => Http::response('', 302, ['Location' => 'https://cdn2.example/live/b.m3u8']),
            'cdn2.example/*' => Http::response("#EXTM3U\n#EXTINF:6,\nseg.ts\n"),
        ]);
        [$user, $tokenId] = $this->makeSession();
        $res = $this->get($this->path(ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $user->id, $tokenId)))->assertOk();
        $this->assertStringContainsString('https://cdn2.example/live/seg.ts', $res->getContent());
    }

    public function test_ipv4_mapped_and_cgnat_addresses_are_not_public(): void
    {
        $safe = new SafeHost(fn () => []);
        foreach (['http://[::ffff:127.0.0.1]/x', 'http://[::ffff:7f00:1]/x', 'http://[64:ff9b::7f00:1]/x', 'http://100.64.0.1/x', 'http://[::1]/x', 'http://169.254.169.254/x'] as $url) {
            $this->assertFalse($safe->isPublic($url), $url);
        }
        $this->assertTrue($safe->isPublic('http://93.184.216.34/x'));
    }

    public function test_host_with_any_private_address_is_refused(): void
    {
        $safe = new SafeHost(fn () => ['93.184.216.34', '::1']);
        $this->assertFalse($safe->isPublic('https://doble.example/x.m3u8'));
    }

    public function test_oversized_origin_response_is_refused(): void
    {
        Http::fake(['origen.example/*' => Http::response(str_repeat('a', 2 * 1024 * 1024 + 10))]);
        [$user, $tokenId] = $this->makeSession();
        $this->get($this->path(ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $user->id, $tokenId)))
            ->assertStatus(502)->assertJsonPath('code', 'origin_error');
    }

    public function test_content_type_is_forced_to_manifest_type(): void
    {
        Http::fake(['origen.example/*' => Http::response("#EXTM3U\n", 200, ['Content-Type' => 'text/html'])]);
        [$user, $tokenId] = $this->makeSession();
        $this->get($this->path(ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $user->id, $tokenId)))
            ->assertOk()->assertHeader('Content-Type', 'application/vnd.apple.mpegurl');
    }

    public function test_proxy_url_does_not_reveal_origin(): void
    {
        $signed = ProxyUrlSigner::sign('https://secreto-proveedor.example/live.m3u8?token=XYZ', 600, 1, 2, ['Referer' => 'https://referer-secreto.example/']);
        parse_str(parse_url($signed, PHP_URL_QUERY), $q);
        foreach ($q as $value) {
            $decoded = (string) base64_decode(strtr($value, '-_', '+/'));
            $this->assertStringNotContainsString('secreto-proveedor', $decoded);
            $this->assertStringNotContainsString('referer-secreto', $decoded);
        }
        $this->assertStringNotContainsString('secreto-proveedor', $signed);
        $this->assertSame('https://secreto-proveedor.example/live.m3u8?token=XYZ', ProxyUrlSigner::verify($q)['url']);
    }

    public function test_throttle_is_per_session_not_per_ip(): void
    {
        Http::fake(['origen.example/*' => Http::response("#EXTM3U\n")]);
        [$userA, $tokenA] = $this->makeSession();
        [$userB, $tokenB] = $this->makeSession();
        $a = $this->path(ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $userA->id, $tokenA));
        $b = $this->path(ProxyUrlSigner::sign('https://origen.example/a.m3u8', 600, $userB->id, $tokenB));

        for ($i = 0; $i < 100; $i++) {
            $this->get($a)->assertOk();
        }
        for ($i = 0; $i < 100; $i++) {
            $this->get($b)->assertOk();
        }
    }
}
