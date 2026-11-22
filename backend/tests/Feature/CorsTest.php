<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsTest extends TestCase
{
    private function preflight(string $origin)
    {
        return $this->call('OPTIONS', '/api/health', [], [], [], [
            'HTTP_ORIGIN' => $origin,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);
    }

    public function test_apk_origin_is_allowed(): void
    {
        $this->preflight('capacitor://localhost')->assertHeader('Access-Control-Allow-Origin', 'capacitor://localhost');
        $this->preflight('https://localhost')->assertHeader('Access-Control-Allow-Origin', 'https://localhost');
    }

    public function test_frontend_origin_is_allowed(): void
    {
        $this->preflight(config('app.frontend_url'))->assertHeader('Access-Control-Allow-Origin', config('app.frontend_url'));
    }

    public function test_unknown_origin_is_not_allowed(): void
    {
        $this->assertNotSame('https://evil.example', $this->preflight('https://evil.example')->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $this->preflight('https://evil.example')->headers->get('Access-Control-Allow-Origin'));
    }
}
