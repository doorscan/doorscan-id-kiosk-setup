<?php

use App\Models\Advert;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('the live adverts endpoint returns live advert screens in random order', function () {
    Storage::fake('public');

    config()->set('queue.default', 'sync');
    config()->set('media-library.queue_conversions_by_default', false);

    $this->actingAs(User::factory()->create());

    $firstLiveAdvert = Advert::factory()->create([
        'active_from' => now()->subHour(),
        'active_to' => null,
    ]);
    $firstLiveAdvert
        ->addMedia(UploadedFile::fake()->image('first-advert.jpg', 1920, 1080))
        ->toMediaCollection('advert');

    $secondLiveAdvert = Advert::factory()->create([
        'active_from' => now()->subMinutes(30),
        'active_to' => now()->addHour(),
    ]);
    $secondLiveAdvert
        ->addMedia(UploadedFile::fake()->image('second-advert.jpg', 1920, 1080))
        ->toMediaCollection('advert');

    $expiredAdvert = Advert::factory()->create([
        'active_from' => now()->subHours(2),
        'active_to' => now()->subMinute(),
    ]);
    $expiredAdvert
        ->addMedia(UploadedFile::fake()->image('expired-advert.jpg', 1920, 1080))
        ->toMediaCollection('advert');

    Advert::factory()->create([
        'active_from' => now()->subMinute(),
        'active_to' => now()->addMinute(),
    ]);

    $response = $this->getJson(route('adverts.live'));

    $response
        ->assertOk()
        ->assertJsonPath('advert_display_time_in_seconds', 60);

    expect(collect($response->json('adverts'))->sortBy('id')->values()->all())
        ->toBe([
            $firstLiveAdvert->toDisplayPayload(),
            $secondLiveAdvert->toDisplayPayload(),
        ]);
});
