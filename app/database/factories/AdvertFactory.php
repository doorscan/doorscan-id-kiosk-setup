<?php

namespace Database\Factories;

use App\Models\Advert;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

class AdvertFactory extends Factory
{
    protected $model = Advert::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'active_from' => Carbon::now(),
            'active_to' => Carbon::now(),
            'description' => $this->faker->text(),
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ];
    }
}
