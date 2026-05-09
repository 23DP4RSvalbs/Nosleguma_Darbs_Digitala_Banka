<?php

namespace Database\Seeders;

use App\Support\DemoDataResetter;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        app(DemoDataResetter::class)->refresh();
    }
}
