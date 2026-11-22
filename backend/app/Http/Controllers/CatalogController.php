<?php

namespace App\Http\Controllers;

use App\Http\Resources\CatalogEventResource;
use App\Models\Event;

class CatalogController extends Controller
{
    public function index()
    {
        $now = now();
        $base = fn () => Event::query()->where('is_visible', true)->withCount('links');

        $live = $base()->where('starts_at', '<=', $now)
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', $now))
            ->orderByDesc('is_featured')->orderBy('starts_at')->get();

        $upcoming = $base()->where('starts_at', '>', $now)->orderBy('starts_at')->limit(20)->get();

        $categories = $live->concat($upcoming)->groupBy('category')
            ->map(fn ($events, $name) => ['name' => $name, 'events' => CatalogEventResource::collection($events->values())])
            ->sortKeys()->values();

        return response()->json([
            'live' => CatalogEventResource::collection($live),
            'upcoming' => CatalogEventResource::collection($upcoming),
            'categories' => $categories,
        ]);
    }
}
