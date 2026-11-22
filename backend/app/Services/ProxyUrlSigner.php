<?php

namespace App\Services;

class ProxyUrlSigner
{
    public static function sign(string $url, int $ttlSeconds, int $userId, int $tokenId): string
    {
        $u = self::b64($url);
        $e = now()->getTimestamp() + $ttlSeconds;

        return rtrim(config('app.url'), '/').'/api/proxy/manifest?'.http_build_query([
            'u' => $u,
            'e' => $e,
            'k' => $tokenId,
            'i' => $userId,
            's' => self::signature($u, $e, $userId, $tokenId),
        ]);
    }

    /** @return array{url: string, user_id: int, token_id: int}|null */
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

        [$e, $k, $i] = [(int) $query['e'], (int) $query['k'], (int) $query['i']];
        if (! hash_equals(self::signature($query['u'], $e, $i, $k), $query['s']) || $e < now()->getTimestamp()) {
            return null;
        }

        $url = base64_decode(strtr($query['u'], '-_', '+/'), true);

        return $url === false ? null : ['url' => $url, 'user_id' => $i, 'token_id' => $k];
    }

    private static function signature(string $u, int $e, int $userId, int $tokenId): string
    {
        return hash_hmac('sha256', "{$u}.{$e}.{$userId}.{$tokenId}", (string) config('app.key'));
    }

    private static function b64(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }
}
