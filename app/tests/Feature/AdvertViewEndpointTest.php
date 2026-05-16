<?php

use App\Jobs\StoreAdvertViewJob;
use App\Models\Advert;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

test('the advert views endpoint queues advert view storage and returns accepted', function () {
    Queue::fake();

    $this->actingAs(User::factory()->create());

    $advert = Advert::factory()->create();

    $response = $this->postJson(route('adverts.views'), [
        'advert_id' => $advert->id,
        'displayed_seconds' => 60,
        'ended_at' => '2026-04-20T20:01:00.000Z',
        'started_at' => '2026-04-20T20:00:00.000Z',
    ]);

    $response->assertAccepted();

    Queue::assertPushed(StoreAdvertViewJob::class, function (StoreAdvertViewJob $job) use ($advert): bool {
        return $job->advertId === $advert->id
            && $job->displayedSeconds === 60
            && $job->startedAt === '2026-04-20T20:00:00.000Z'
            && $job->endedAt === '2026-04-20T20:01:00.000Z';
    });
});

test('the advert views endpoint validates the payload', function () {
    Queue::fake();

    $this->actingAs(User::factory()->create());

    $response = $this->postJson(route('adverts.views'), [
        'advert_id' => 999999,
        'displayed_seconds' => -1,
        'ended_at' => '2026-04-20T19:59:00.000Z',
        'started_at' => '2026-04-20T20:00:00.000Z',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors([
            'advert_id',
            'displayed_seconds',
            'ended_at',
        ]);

    Queue::assertNothingPushed();
});
