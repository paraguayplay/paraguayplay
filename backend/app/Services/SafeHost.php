<?php

namespace App\Services;

use Closure;

/** Evita que el proxy se use para llegar a direcciones internas (SSRF). */
class SafeHost
{
    private Closure $resolver;

    public function __construct(?Closure $resolver = null)
    {
        $this->resolver = $resolver ?? function (string $host): array {
            $ips = [];
            foreach (@dns_get_record($host, DNS_A | DNS_AAAA) ?: [] as $r) {
                $ips[] = $r['ip'] ?? $r['ipv6'] ?? null;
            }
            $ips = array_values(array_filter($ips));

            return $ips ?: (gethostbynamel($host) ?: []);
        };
    }

    public function isPublic(string $url): bool
    {
        return $this->publicIps($url) !== null;
    }

    /**
     * IPs públicas a las que se puede conectar para esta URL, o null si alguna no es pública.
     *
     * @return list<string>|null
     */
    public function publicIps(string $url): ?array
    {
        $p = parse_url($url);
        if (! $p || ! in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || empty($p['host'])) {
            return null;
        }

        $host = strtolower(trim($p['host'], '[]'));
        if ($host === 'localhost' || str_ends_with($host, '.localhost') || str_ends_with($host, '.local') || str_ends_with($host, '.internal')) {
            return null;
        }

        $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : ($this->resolver)($host);
        if ($ips === []) {
            return null;
        }

        foreach ($ips as $ip) {
            if (! self::isPublicIp($ip)) {
                return null;
            }
        }

        return array_values($ips);
    }

    public static function isPublicIp(string $ip): bool
    {
        $bin = @inet_pton($ip);
        if ($bin === false) {
            return false;
        }

        if (strlen($bin) === 16) {
            // ::ffff:a.b.c.d (IPv4 mapeada) y 64:ff9b::/96 (NAT64) se revisan como IPv4
            if (str_starts_with($bin, str_repeat("\0", 10)."\xff\xff") || str_starts_with($bin, "\x00\x64\xff\x9b".str_repeat("\0", 8))) {
                return self::isPublicIp(inet_ntop(substr($bin, 12)));
            }
            // ::/96 (IPv4 compatible, obsoleta)
            if (str_starts_with($bin, str_repeat("\0", 12))) {
                return false;
            }
        } else {
            // 100.64.0.0/10 (CGNAT) no lo cubre filter_var
            if (ord($bin[0]) === 100 && (ord($bin[1]) & 0xC0) === 64) {
                return false;
            }
        }

        return (bool) filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    }
}
