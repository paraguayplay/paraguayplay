<?php

namespace App\Services;

class ProxyUrlSigner
{
    /** @param array<string, string> $headers cabeceras que el proxy enviará al origen (Referer, User-Agent) */
    public static function sign(string $url, int $ttlSeconds, int $userId, int $tokenId, array $headers = []): string
    {
        $u = self::b64($url);
        $e = now()->getTimestamp() + $ttlSeconds;
        $h = $headers ? self::b64(json_encode($headers, JSON_UNESCAPED_SLASHES)) : '';

        return rtrim(config('app.url'), '/').'/api/proxy/manifest?'.http_build_query(array_filter([
            'u' => $u,
            'e' => $e,
            'k' => $tokenId,
            'i' => $userId,
            'h' => $h,
            's' => self::signature($u, $e, $userId, $tokenId, $h),
        ], fn ($v) => $v !== ''));
    }

    /** @return array{url: string, user_id: int, token_id: int, headers?: array, expires?: int}|null */
    public static function verify(array $query): ?array
    {
        foreach (['u', 'e', 'k', 'i', 's'] as $key) {
            if (! isset($query[$key]) || ! is_string($query[$key]) || $query[$key] === '') {
                return null;
            }
        }
        if (! ctype_digit($query['e']) || ! ctype_digit($query['k']) || ! ctype_digit($query['i'])) {
            return null;
        }
        $h = isset($query['h']) && is_string($query['h']) ? $query['h'] : '';

        [$e, $k, $i] = [(int) $query['e'], (int) $query['k'], (int) $query['i']];
        if (! hash_equals(self::signature($query['u'], $e, $i, $k, $h), $query['s']) || $e < now()->getTimestamp()) {
            return null;
        }

        $url = self::unb64($query['u']);
        if ($url === null) {
            return null;
        }

        $out = ['url' => $url, 'user_id' => $i, 'token_id' => $k];
        if ($h !== '') {
            $out['headers'] = json_decode((string) self::unb64($h), true) ?: [];
        }

        return $out;
    }

    /** Igual que verify() pero incluye la expiración, para firmar listas anidadas con el mismo plazo. */
    public static function verifyWithExpiry(array $query): ?array
    {
        $v = self::verify($query);

        return $v === null ? null : $v + ['expires' => (int) $query['e']];
    }

    private static function signature(string $u, int $e, int $userId, int $tokenId, string $h): string
    {
        return hash_hmac('sha256', "{$u}.{$e}.{$userId}.{$tokenId}.{$h}", (string) config('app.key'));
    }

    private static function b64(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    private static function unb64(string $s): ?string
    {
        $out = base64_decode(strtr($s, '-_', '+/'), true);

        return $out === false ? null : $out;
    }
}
