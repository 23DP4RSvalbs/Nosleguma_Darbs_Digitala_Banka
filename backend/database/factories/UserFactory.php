<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;


class UserFactory extends Factory
{
   
    protected static ?string $password;

   
    public function definition(): array
    {
        return [
            'role_id' => null,
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'preferred_currency' => 'EUR',
            'locale' => 'lv',
            'timezone' => 'Europe/Riga',
            'date_format' => 'dd.mm.yyyy',
            'amount_format' => 'local',
            'email_notifications' => true,
            'push_notifications' => true,
            'marketing_notifications' => false,
            'compact_mode' => false,
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'status' => 'active',
            'remember_token' => Str::random(10),
        ];
    }

    
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
