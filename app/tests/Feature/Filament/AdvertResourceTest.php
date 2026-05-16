<?php

use App\Filament\Resources\Adverts\Pages\CreateAdvert;
use App\Models\Advert;
use App\Models\User;
use Filament\Facades\Filament;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;

beforeEach(function (): void {
    Filament::setCurrentPanel('admin');
});

test('an admin can create an advert with an uploaded image', function () {
    Storage::fake('public');

    config()->set('queue.default', 'sync');
    config()->set('media-library.queue_conversions_by_default', false);

    $this->actingAs(User::factory()->create());

    Livewire::test(CreateAdvert::class)
        ->fillForm([
            'name' => 'Front Desk Screen',
            'description' => 'Advert shown on the lobby screen.',
            'advert' => UploadedFile::fake()->image('advert.jpg', 1920, 1080),
        ])
        ->call('create')
        ->assertHasNoFormErrors()
        ->assertNotified()
        ->assertRedirect();

    $advert = Advert::query()->first();

    expect($advert)->not->toBeNull();

    $media = $advert->getFirstMedia('advert');

    expect($media)->not->toBeNull()
        ->and($media->disk)->toBe('public');

    Storage::disk('public')->assertExists($media->getPathRelativeToRoot());
});
