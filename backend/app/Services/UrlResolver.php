<?php

namespace App\Services;

class UrlResolver
{
    public static function resolve(string $base, string $ref): string
    {
        $ref = trim($ref);
        if (preg_match('#^[a-z][a-z0-9+.-]*://#i', $ref)) {
            return $ref;
        }

        $p = parse_url($base);
        $scheme = $p['scheme'] ?? 'https';
        $origin = $scheme.'://'.($p['host'] ?? '').(isset($p['port']) ? ':'.$p['port'] : '');

        if (str_starts_with($ref, '//')) {
            return $scheme.':'.$ref;
        }
        if (str_starts_with($ref, '/')) {
            return $origin.self::normalize($ref);
        }

        $dir = preg_replace('#/[^/]*$#', '/', $p['path'] ?? '/');

        return $origin.self::normalize($dir.$ref);
    }

    private static function normalize(string $path): string
    {
        [$pathOnly, $query] = array_pad(explode('?', $path, 2), 2, null);
        $out = [];
        foreach (explode('/', $pathOnly) as $seg) {
            if ($seg === '..') {
                if (count($out) > 1) {
                    array_pop($out);
                }
            } elseif ($seg !== '.') {
                $out[] = $seg;
            }
        }

        return implode('/', $out).($query !== null ? '?'.$query : '');
    }
}
