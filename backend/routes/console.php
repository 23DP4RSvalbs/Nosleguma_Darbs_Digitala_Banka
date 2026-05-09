<?php

use App\Support\DemoDataResetter;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('demo:refresh', function () {
    $summary = app(DemoDataResetter::class)->refresh();

    $this->components->info('Demo dataset refreshed.');
    $this->components->twoColumnDetail('Users', (string) $summary['users']);
    $this->components->twoColumnDetail('Accounts', (string) $summary['accounts']);
    $this->components->twoColumnDetail('Transactions', (string) $summary['transactions']);
    $this->components->twoColumnDetail('Notifications', (string) $summary['notifications']);
})->purpose('Reset the app to the two demo users and rich presentation data');
