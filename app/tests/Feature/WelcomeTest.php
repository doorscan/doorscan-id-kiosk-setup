<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests can view the welcome screen', function () {
    $response = $this->get(route('welcome'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page->component('Welcome'));
});

test('authenticated users are redirected from the welcome screen to home', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('welcome'));

    $response->assertRedirect(route('home'));
});
