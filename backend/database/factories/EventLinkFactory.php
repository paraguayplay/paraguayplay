<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\EventLink;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<EventLink> */
class EventLinkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'type' => 'hls',
            'url' => 'https://cdn.proveedor.example/live/'.fake()->uuid().'/index.m3u8',
            'label' => 'Servidor 1',
            'sort_order' => 0,
        ];
    }
}
