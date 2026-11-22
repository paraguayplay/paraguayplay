<?php

namespace App\Services;

class ManifestRewriter
{
    /**
     * Listas anidadas pasan por $signNested (proxy); segmentos, claves e init quedan absolutos directos al origen.
     */
    public function rewriteHls(string $body, string $baseUrl, callable $signNested): string
    {
        $lines = preg_split('/\r?\n/', $body);
        $nextIsPlaylist = false;

        foreach ($lines as $i => $line) {
            $trim = trim($line);
            if ($trim === '') {
                continue;
            }

            if (str_starts_with($trim, '#')) {
                $isPlaylistTag = str_starts_with($trim, '#EXT-X-MEDIA:') || str_starts_with($trim, '#EXT-X-I-FRAME-STREAM-INF:');
                $lines[$i] = preg_replace_callback('/URI="([^"]*)"/', function ($m) use ($baseUrl, $signNested, $isPlaylistTag) {
                    $abs = UrlResolver::resolve($baseUrl, $m[1]);

                    return 'URI="'.($isPlaylistTag ? $signNested($abs) : $abs).'"';
                }, $line);
                if (str_starts_with($trim, '#EXT-X-STREAM-INF')) {
                    $nextIsPlaylist = true;
                }

                continue;
            }

            $abs = UrlResolver::resolve($baseUrl, $trim);
            $isPlaylist = $nextIsPlaylist || preg_match('/\.m3u8?($|\?)/i', $trim);
            $lines[$i] = $isPlaylist ? $signNested($abs) : $abs;
            $nextIsPlaylist = false;
        }

        return implode("\n", $lines);
    }

    public function rewriteDash(string $body, string $baseUrl): string
    {
        $periodPos = stripos($body, '<Period');
        if (preg_match('#<BaseURL>([^<]*)</BaseURL>#i', $body, $m, PREG_OFFSET_CAPTURE)
            && ($periodPos === false || $m[0][1] < $periodPos)) {
            $current = trim($m[1][0]);
            if (preg_match('#^https?://#i', $current)) {
                return $body;
            }

            return substr_replace($body, '<BaseURL>'.htmlspecialchars(UrlResolver::resolve($baseUrl, $current), ENT_XML1).'</BaseURL>', $m[0][1], strlen($m[0][0]));
        }

        $dir = UrlResolver::resolve($baseUrl, './');

        return preg_replace('#(<MPD\b[^>]*>)#i', '$1<BaseURL>'.htmlspecialchars($dir, ENT_XML1).'</BaseURL>', $body, 1);
    }
}
