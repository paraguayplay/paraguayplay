<?php

namespace App\Services;

use RuntimeException;

/**
 * Cifra la respuesta de /play con AES-256-GCM.
 * Formato compatible con WebCrypto: payload = base64(ciphertext || tag de 16 bytes), iv = base64(12 bytes).
 */
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

    /** @return array{payload: string, iv: string} */
    public static function encrypt(array $data, string $key): array
    {
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt(json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, '', 16);
        if ($cipher === false) {
            throw new RuntimeException('No se pudo cifrar la respuesta.');
        }

        return ['payload' => base64_encode($cipher.$tag), 'iv' => base64_encode($iv)];
    }

    public static function decrypt(string $payload, string $iv, string $key): array
    {
        $raw = base64_decode($payload);
        $plain = openssl_decrypt(substr($raw, 0, -16), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, base64_decode($iv), substr($raw, -16));
        if ($plain === false) {
            throw new RuntimeException('No se pudo descifrar la respuesta.');
        }

        return json_decode($plain, true);
    }
}
