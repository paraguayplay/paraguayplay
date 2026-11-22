<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventLink;
use App\Services\PlayPayloadCipher;
use App\Services\ProxyUrlSigner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlayController extends Controller
{
    public const PROXY_TTL = 14400;

    public function show(Request $request, int $id)
    {
        $event = Event::where('is_visible', true)->with('links')->findOrFail($id);
        $user = $request->user();
        $tokenId = (int) $user->currentAccessToken()->getKey();

        DB::table('play_logs')->insert([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'token_id' => $tokenId ?: null,
            'ip' => (string) $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
            'created_at' => now(),
        ]);

        $links = $event->links->map(fn (EventLink $l) => [
            'label' => $l->label,
            'type' => $l->type,
            'url' => $l->use_proxy && $l->type !== 'web'
                ? ProxyUrlSigner::sign($l->url, self::PROXY_TTL, $user->id, $tokenId, $l->headers ?? [])
                : $l->url,
            'drm' => [
                'type' => $l->drm_type,
                'clearkeys' => $l->drm_clearkeys,
                'license_url' => $l->drm_license_url,
            ],
            'headers' => $l->headers,
        ])->values()->all();

        $encrypted = PlayPayloadCipher::encrypt(['links' => $links], PlayPayloadCipher::keyForToken($tokenId));

        return response()->json(['event' => ['id' => $event->id, 'title' => $event->title]] + $encrypted)
            ->header('Cache-Control', 'no-store');
    }
}
