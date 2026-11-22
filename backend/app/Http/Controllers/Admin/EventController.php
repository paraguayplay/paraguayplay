<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminEventResource;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    private const RULES = [
        'title' => ['string', 'max:150'],
        'description' => ['nullable', 'string', 'max:2000'],
        'image_path' => ['nullable', 'string', 'max:255'],
        'category' => ['string', 'max:60'],
        'starts_at' => ['date'],
        'ends_at' => ['nullable', 'date', 'after:starts_at'],
        'is_visible' => ['boolean'],
        'is_featured' => ['boolean'],
    ];

    public function index(Request $request)
    {
        $page = Event::with('links')->withCount('links')
            ->when($request->input('q'), fn ($q, $t) => $q->where('title', 'like', "%{$t}%"))
            ->orderByDesc('starts_at')->paginate(25);

        return AdminEventResource::collection($page);
    }

    public function store(Request $request)
    {
        $rules = self::RULES;
        foreach (['title', 'category', 'starts_at'] as $k) {
            array_unshift($rules[$k], 'required');
        }
        $data = $request->validate($rules + EventLinkController::rules());

        $event = DB::transaction(function () use ($data) {
            $event = Event::create(collect($data)->except('links')->all());
            EventLinkController::replaceLinks($event, $data['links'] ?? []);

            return $event;
        });

        return (new AdminEventResource($event->load('links')))->response()->setStatusCode(201);
    }

    public function show(Event $event)
    {
        return new AdminEventResource($event->load('links'));
    }

    public function update(Request $request, Event $event)
    {
        $rules = array_map(fn ($r) => array_merge(['sometimes'], $r), self::RULES);
        $event->update($request->validate($rules));

        return new AdminEventResource($event->load('links'));
    }

    public function destroy(Event $event)
    {
        $event->delete();

        return response()->noContent();
    }
}
