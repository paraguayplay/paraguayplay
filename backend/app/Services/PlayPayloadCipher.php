<?php

namespace App\Services;

class PlayPayloadCipher
{
    /** Clave de 32 bytes ligada a un token de sesión. */
    public static function keyForToken(int $tokenId): string
    {
        return hash_hmac('sha256', 'play:'.$tokenId, (string) config('app.key'), true);
    }

    public static function sessionKeyFor(int $tokenId): string
    {
        return base64_encode(self::keyForToken($tokenId));
    }
}
