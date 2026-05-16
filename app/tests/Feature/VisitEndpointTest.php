<?php

use App\Jobs\StoreVisitJob;
use App\Models\User;
use Illuminate\Support\Facades\Bus;

function fakeVisitPhotoDataUrl(): string
{
    $encodedPhoto = base64_encode(file_get_contents(base_path('public/apple-touch-icon.png')));

    return "data:image/png;base64,{$encodedPhoto}";
}

function fakeVisitScanPayload(): array
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

test('the visit endpoint defers visit storage until after the response and returns accepted', function () {
    Bus::fake();

    $this->actingAs(User::factory()->create());

    $response = $this->postJson(route('visit.record'), [
        'scan' => fakeVisitScanPayload(),
        'visit_at' => '2026-04-20T21:00:00.000Z',
        'photo' => fakeVisitPhotoDataUrl(),
    ]);

    $response->assertAccepted();

    Bus::assertDispatchedAfterResponse(StoreVisitJob::class, function (StoreVisitJob $job): bool {
        return $job->visitAt === '2026-04-20T21:00:00.000Z'
            && str_starts_with($job->photo, 'data:image/png;base64,')
            && data_get($job->scan, 'status') === 'succeeded'
            && data_get($job->scan, 'data.first_name') === 'Ada'
            && data_get($job->scan, 'images.scan_image') === '/apple-touch-icon.png'
            && data_get($job->scan, 'images.extracted_face_image') === '/web-app-manifest-192x192.png';
    });
});

test('the visit endpoint validates the payload', function () {
    Bus::fake();

    $this->actingAs(User::factory()->create());

    $response = $this->postJson(route('visit.record'), [
        'scan' => [
            'status' => 'in-progress',
        ],
        'visit_at' => 'not-a-date',
        'photo' => 'not-a-photo',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors([
            'scan.data',
            'scan.images',
            'scan.status',
            'visit_at',
            'photo',
        ]);

    Bus::assertNothingDispatched();
});
