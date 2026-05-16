<?php

test('the welcome page includes the shared favicon and manifest markup', function () {
    $this->withoutVite();

    $response = $this->get(route('welcome'));

    $response->assertSuccessful();

    $response->assertSee('<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />', escape: false);
    $response->assertSee('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />', escape: false);
    $response->assertSee('<link rel="shortcut icon" href="/favicon.ico" />', escape: false);
    $response->assertSee('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />', escape: false);
    $response->assertSee('<meta name="apple-mobile-web-app-title" content="DoorscanID" />', escape: false);
    $response->assertSee('<link rel="manifest" href="/site.webmanifest" />', escape: false);
});

test('the web manifest is configured for a fullscreen portrait kiosk', function () {
    $manifest = json_decode(file_get_contents(public_path('site.webmanifest')), true, flags: JSON_THROW_ON_ERROR);

    expect($manifest)
        ->toMatchArray([
            'name' => 'DoorscanID',
            'short_name' => 'DoorscanID',
            'display' => 'fullscreen',
            'orientation' => 'portrait',
        ]);
});
