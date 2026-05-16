<?php

use App\Jobs\StoreVisitJob;
use App\Models\Visit;
use App\Models\Visitor;
use Illuminate\Support\Facades\Storage;

function fakeStoredVisitPhotoDataUrl(): string
{
    $encodedPhoto = base64_encode(file_get_contents(base_path('public/apple-touch-icon.png')));

    return "data:image/png;base64,{$encodedPhoto}";
}

function fakeStoredVisitScanPayload(): array
{
    return [
        'data' => [
            'address' => '12 Test Street',
            'dob' => '1815-12-10',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'ocr_data_raw' => [
                'documentNumber' => '123456789',
            ],
            'type' => 'passport',
        ],
        'finished_at' => '2026-04-20T21:00:08.000Z',
        'images' => [
            'extracted_face_image' => '/web-app-manifest-192x192.png',
            'scan_image' => '/apple-touch-icon.png',
        ],
        'message' => 'Document scan complete.',
        'started_at' => '2026-04-20T21:00:00.000Z',
        'status' => 'succeeded',
    ];
}

test('the store visit job persists the visit, scan data, and scan media', function () {
    Storage::fake('public');

    $job = new StoreVisitJob(
        visitAt: '2026-04-20T21:00:00.000Z',
        photo: fakeStoredVisitPhotoDataUrl(),
        scan: fakeStoredVisitScanPayload(),
    );

    $job->handle();

    $visit = Visit::query()->first();
    $visitor = Visitor::query()->first();

    expect($visit)
        ->not->toBeNull()
        ->and($visit->visit_at?->toISOString())->toBe('2026-04-20T21:00:00.000000Z')
        ->and($visit->scan_data)->toMatchArray([
            'data' => [
                'address' => '12 Test Street',
                'dob' => '1815-12-10',
                'first_name' => 'Ada',
                'last_name' => 'Lovelace',
                'ocr_data_raw' => [
                    'documentNumber' => '123456789',
                ],
                'type' => 'passport',
            ],
            'finished_at' => '2026-04-20T21:00:08.000Z',
            'message' => 'Document scan complete.',
            'started_at' => '2026-04-20T21:00:00.000Z',
            'status' => 'succeeded',
        ])
        ->and($visit->scan_data)->not->toHaveKey('images')
        ->and($visit->getFirstMedia('photo'))->not->toBeNull()
        ->and($visit->getFirstMedia('scan_image'))->not->toBeNull()
        ->and($visit->getFirstMedia('extracted_face_image'))->not->toBeNull();

    expect($visitor)
        ->not->toBeNull()
        ->and($visitor?->first_name)->toBe('Ada')
        ->and($visitor?->last_name)->toBe('Lovelace')
        ->and($visitor?->date_of_birth?->toDateString())->toBe('1815-12-10');

    $photo = $visit?->getFirstMedia('photo');
    $scanImage = $visit?->getFirstMedia('scan_image');
    $extractedFaceImage = $visit?->getFirstMedia('extracted_face_image');

    expect($photo)->not->toBeNull();
    expect($scanImage)->not->toBeNull();
    expect($extractedFaceImage)->not->toBeNull();

    Storage::disk('public')->assertExists($photo->getPathRelativeToRoot());
    Storage::disk('public')->assertExists($scanImage->getPathRelativeToRoot());
    Storage::disk('public')->assertExists($extractedFaceImage->getPathRelativeToRoot());
});
