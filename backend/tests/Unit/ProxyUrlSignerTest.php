<?php

namespace Tests\Unit;

use App\Services\ProxyUrlSigner;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ProxyUrlSignerTest extends TestCase
{
    private function query(string $signed): array
    {
        parse_str(parse_url($signed, PHP_URL_QUERY), $q);

        return $q;
    }

    public function test_sign_and_verify(): void
    {
        $signed = ProxyUrlSigner::sign('https://origen.com/live/index.m3u8', 3600, 7, 42);
        $this->assertStringStartsWith(config('app.url').'/api/proxy/manifest?', $signed);

        $this->assertSame(
            ['url' => 'https://origen.com/live/index.m3u8', 'user_id' => 7, 'token_id' => 42],
            ProxyUrlSigner::verify($this->query($signed)),
        );
    }

    public function test_tampered_signature_is_rejected(): void
    {
        $q = $this->query(ProxyUrlSigner::sign('https://origen.com/a.m3u8', 3600, 7, 42));
        $q['k'] = '43';
        $this->assertNull(ProxyUrlSigner::verify($q));

        $q = $this->query(ProxyUrlSigner::sign('https://origen.com/a.m3u8', 3600, 7, 42));
        $q['u'] = rtrim(strtr(base64_encode('https://otro.com/a.m3u8'), '+/', '-_'), '=');
        $this->assertNull(ProxyUrlSigner::verify($q));

        $this->assertNull(ProxyUrlSigner::verify([]));
    }

    public function test_expired_signature_is_rejected(): void
    {
        $q = $this->query(ProxyUrlSigner::sign('https://origen.com/a.m3u8', 60, 7, 42));
        Carbon::setTestNow(now()->addSeconds(61));
        $this->assertNull(ProxyUrlSigner::verify($q));
        Carbon::setTestNow();
    }
}
