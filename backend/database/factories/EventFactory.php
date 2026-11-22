<?php

namespace Database\Factories;

use App\Models\Event;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Event> */
class EventFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'description' => fake()->sentence(),
            'category' => 'Deportes',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHours(2),
            'is_visible' => true,
            'is_featured' => false,
        ];
    }

    public function upcoming(int $hours = 5): static
    {
        return $this->state(fn () => ['starts_at' => now()->addHours($hours), 'ends_at' => now()->addHours($hours + 2)]);
    }

    public function finished(): static
    {
        return $this->state(fn () => ['starts_at' => now()->subHours(5), 'ends_at' => now()->subHours(3)]);
    }
}
