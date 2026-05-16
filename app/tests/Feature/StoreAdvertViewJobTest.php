<?php

use App\Jobs\StoreAdvertViewJob;
use App\Models\Advert;
use App\Models\AdvertView;

test('the store advert view job persists advert view data', function () {
    $advert = Advert::factory()->create();

    $job = new StoreAdvertViewJob(
        advertId: $advert->id,
        startedAt: '2026-04-20T20:00:00.000Z',
        endedAt: '2026-04-20T20:01:00.000Z',
        displayedSeconds: 60,
    );

    $job->handle();

    $advertView = AdvertView::query()->first();

    expect($advertView)
        ->not->toBeNull()
        ->and($advertView->advert_id)->toBe($advert->id)
        ->and($advertView->displayed_seconds)->toBe(60)
        ->and($advertView->started_at?->toISOString())->toBe('2026-04-20T20:00:00.000000Z')
        ->and($advertView->ended_at?->toISOString())->toBe('2026-04-20T20:01:00.000000Z');
});
