<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** @extends Factory<User> */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '0981'.fake()->numerify('######'),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    public function active(int $days = 30): static
    {
        return $this->state(fn () => ['status' => 'active', 'expires_at' => now()->addDays($days)]);
    }

    public function expired(): static
    {
        return $this->state(fn () => ['status' => 'active', 'expires_at' => now()->subDay()]);
    }

    public function suspended(): static
    {
        return $this->state(fn () => ['status' => 'suspended']);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => 'admin', 'status' => 'active']);
    }
}
