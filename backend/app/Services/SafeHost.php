<?php

namespace App\Services;

use Closure;

/** Evita que el proxy se use para llegar a direcciones internas (SSRF). */
class SafeHost
{
    private Closure $resolver;

    public function __construct(?Closure $resolver = null)
    {
        $this->resolver = $resolver ?? fn (string $host) => gethostbynamel($host) ?: [];
    }

    public function isPublic(string $url): bool
    {
        $p = parse_url($url);
        if (! $p || ! in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || empty($p['host'])) {
            return false;
        }

        $host = strtolower(trim($p['host'], '[]'));
        if ($host === 'localhost' || str_ends_with($host, '.localhost') || str_ends_with($host, '.local')) {
            return false;
        }

        $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : ($this->resolver)($host);
        if ($ips === []) {
            return false;
        }

        foreach ($ips as $ip) {
            if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return false;
            }
        }

        return true;
    }
}
