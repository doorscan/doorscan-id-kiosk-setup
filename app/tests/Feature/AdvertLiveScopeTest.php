<?php

use App\Models\Advert;
use Illuminate\Support\Carbon;

afterEach(function (): void {
    Carbon::setTestNow();
});

test('the live scope includes adverts without an active end date', function () {
    Carbon::setTestNow('2026-04-20 12:00:00');

    $liveAdvert = Advert::factory()->create([
        'active_from' => now()->subHour(),
        'active_to' => null,
    ]);

    $expiredAdvert = Advert::factory()->create([
        'active_from' => now()->subHours(2),
        'active_to' => now()->subMinute(),
    ]);

    $scheduledAdvert = Advert::factory()->create([
        'active_from' => now()->addMinute(),
        'active_to' => null,
    ]);

    $liveAdverts = Advert::live()->get();

    expect($liveAdverts)
        ->toHaveCount(1)
        ->and($liveAdverts->first()->is($liveAdvert))->toBeTrue()
        ->and($liveAdverts->contains($expiredAdvert))->toBeFalse()
        ->and($liveAdverts->contains($scheduledAdvert))->toBeFalse();
});

test('the live scope still includes adverts whose active end date is in the future', function () {
    Carbon::setTestNow('2026-04-20 12:00:00');

    $liveAdvert = Advert::factory()->create([
        'active_from' => now()->subHour(),
        'active_to' => now()->addHour(),
    ]);

    $liveAdverts = Advert::live()->get();

    expect($liveAdverts)
        ->toHaveCount(1)
        ->and($liveAdverts->first()->is($liveAdvert))->toBeTrue();
});
