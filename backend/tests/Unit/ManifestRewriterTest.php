<?php

namespace Tests\Unit;

use App\Services\ManifestRewriter;
use PHPUnit\Framework\TestCase;

class ManifestRewriterTest extends TestCase
{
    private function signer(): callable
    {
        return fn (string $url) => 'https://mi.app/api/proxy/manifest?x='.rawurlencode($url);
    }

    public function test_master_variants_go_through_proxy(): void
    {
        $master = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2000000\n720p/index.m3u8\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"a\",URI=\"audio/es.m3u8\"\n";
        $out = (new ManifestRewriter)->rewriteHls($master, 'https://origen.com/live/master.m3u8', $this->signer());

        $this->assertStringContainsString("https://mi.app/api/proxy/manifest?x=".rawurlencode('https://origen.com/live/720p/index.m3u8'), $out);
        $this->assertStringContainsString('URI="https://mi.app/api/proxy/manifest?x='.rawurlencode('https://origen.com/live/audio/es.m3u8').'"', $out);
    }

    public function test_media_segments_and_keys_become_absolute_direct(): void
    {
        $media = "#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI=\"key.bin\"\n#EXTINF:6.0,\nseg1.ts\n#EXTINF:6.0,\n/abs/seg2.ts\n#EXTINF:6.0,\nhttps://otro.cdn/seg3.ts?t=1\n";
        $out = (new ManifestRewriter)->rewriteHls($media, 'https://origen.com/live/720p/index.m3u8?tok=abc', $this->signer());

        $this->assertStringContainsString('URI="https://origen.com/live/720p/key.bin"', $out);
        $this->assertStringContainsString("\nhttps://origen.com/live/720p/seg1.ts\n", $out);
        $this->assertStringContainsString("\nhttps://origen.com/abs/seg2.ts\n", $out);
        $this->assertStringContainsString("\nhttps://otro.cdn/seg3.ts?t=1\n", $out);
        $this->assertStringNotContainsString('mi.app', $out);
    }

    public function test_dash_gets_absolute_base_url(): void
    {
        $mpd = '<?xml version="1.0"?><MPD xmlns="urn:mpeg:dash:schema:mpd:2011"><Period><AdaptationSet/></Period></MPD>';
        $out = (new ManifestRewriter)->rewriteDash($mpd, 'https://origen.com/live/manifest.mpd');
        $this->assertStringContainsString('<BaseURL>https://origen.com/live/</BaseURL>', $out);
        $this->assertLessThan(strpos($out, '<Period'), strpos($out, '<BaseURL>'));
    }

    public function test_dash_relative_base_url_is_resolved(): void
    {
        $mpd = '<MPD><BaseURL>video/</BaseURL><Period/></MPD>';
        $out = (new ManifestRewriter)->rewriteDash($mpd, 'https://origen.com/live/manifest.mpd');
        $this->assertStringContainsString('<BaseURL>https://origen.com/live/video/</BaseURL>', $out);
    }

    public function test_dash_absolute_base_url_is_kept(): void
    {
        $mpd = '<MPD><BaseURL>https://cdn.x/a/</BaseURL><Period/></MPD>';
        $this->assertSame($mpd, (new ManifestRewriter)->rewriteDash($mpd, 'https://origen.com/live/manifest.mpd'));
    }
}
