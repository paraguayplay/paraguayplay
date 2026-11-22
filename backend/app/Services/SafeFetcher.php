<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Descarga una lista (m3u8/mpd) de un proveedor sin permitir llegar a direcciones internas:
 * sigue redirecciones a mano revisando cada destino, fija la IP ya revisada y limita el tamaño.
 */
class SafeFetcher
{
    public const MAX_BYTES = 2 * 1024 * 1024;

    private const MAX_REDIRECTS = 3;

    public function __construct(private SafeHost $safeHost) {}

    /**
     * @return array{body: string, url: string, content_type: string}
     *
     * @throws ForbiddenHostException si algún salto apunta a una dirección no pública
     * @throws RuntimeException si el origen falla, no responde o la respuesta es muy grande
     */
    public function get(string $url, array $headers = []): array
    {
        for ($hop = 0; $hop <= self::MAX_REDIRECTS; $hop++) {
            $ips = $this->safeHost->publicIps($url);
            if ($ips === null) {
                throw new ForbiddenHostException($url);
            }

            $p = parse_url($url);
            $port = $p['port'] ?? (strtolower($p['scheme']) === 'https' ? 443 : 80);
            $ip = str_contains($ips[0], ':') ? '['.$ips[0].']' : $ips[0];

            try {
                $response = Http::timeout(8)
                    ->withHeaders($headers)
                    ->withOptions([
                        'allow_redirects' => false,
                        'stream' => true,
                        'curl' => [CURLOPT_RESOLVE => ["{$p['host']}:{$port}:{$ip}"]],
                    ])
                    ->get($url);
            } catch (Throwable $e) {
                throw new RuntimeException('origin_unreachable', 0, $e);
            }

            if ($response->redirect()) {
                $location = $response->header('Location');
                if (! $location) {
                    throw new RuntimeException('origin_error');
                }
                $url = UrlResolver::resolve($url, $location);

                continue;
            }

            if (! $response->successful() || (int) $response->header('Content-Length') > self::MAX_BYTES) {
                throw new RuntimeException('origin_error');
            }

            $stream = $response->toPsrResponse()->getBody();
            $body = '';
            while (! $stream->eof() && strlen($body) <= self::MAX_BYTES) {
                $body .= $stream->read(65536);
            }
            if (strlen($body) > self::MAX_BYTES) {
                throw new RuntimeException('origin_error');
            }

            return ['body' => $body, 'url' => $url, 'content_type' => strtolower($response->header('Content-Type'))];
        }

        throw new RuntimeException('origin_error');
    }
}
