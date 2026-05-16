<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the welcome screen', function () {
    $response = $this->get(route('home'));

    $response->assertRedirect(route('welcome'));
});

test('authenticated users can visit home', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('home'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Home')
        ->where('initialAdvert', null));
});
