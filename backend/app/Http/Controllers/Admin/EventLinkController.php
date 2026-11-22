<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminEventResource;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventLinkController extends Controller
{
    public static function rules(): array
    {
        return [
            'links' => ['sometimes', 'array', 'max:20'],
            'links.*.type' => ['required', 'in:hls,dash,web'],
            'links.*.url' => ['required', 'url:http,https', 'max:2000'],
            'links.*.label' => ['required', 'string', 'max:60'],
            'links.*.drm_type' => ['sometimes', 'in:none,clearkey,widevine'],
            'links.*.drm_clearkeys' => ['sometimes', 'nullable', 'array'],
            'links.*.drm_clearkeys.*' => ['string', 'max:64'],
            'links.*.drm_license_url' => ['sometimes', 'nullable', 'url:http,https', 'max:2000'],
            'links.*.headers' => ['sometimes', 'nullable', 'array'],
            'links.*.headers.*' => ['string', 'max:500'],
            'links.*.use_proxy' => ['sometimes', 'boolean'],
        ];
    }

    public static function replaceLinks(Event $event, array $links): void
    {
        $event->links()->delete();
        foreach (array_values($links) as $i => $link) {
            $event->links()->create(array_merge(['drm_type' => 'none', 'use_proxy' => false], $link, ['sort_order' => $i]));
        }
    }

    public function update(Request $request, Event $event)
    {
        $data = $request->validate(['links' => ['present', 'array', 'max:20']] + self::rules());
        DB::transaction(fn () => self::replaceLinks($event, $data['links']));

        return new AdminEventResource($event->load('links'));
    }
}
