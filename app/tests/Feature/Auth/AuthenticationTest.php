<?php

use App\Models\User;

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post(route('login.store'), [
        'login' => (string) $user->id,
        'password' => '123456',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
});

test('users can authenticate using welcome screen pin lookup', function () {
    $user = User::factory()->create();

    $response = $this->post(route('login.store'), [
        'auth_mode' => 'pin_lookup',
        'login' => '123456',
        'password' => '123456',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('home', absolute: false));
});

test('users can authenticate using email and password fallback', function () {
    $user = User::factory()->withoutPin()->create();

    $response = $this->post(route('login.store'), [
        'login' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
});

test('users can not authenticate with invalid pin', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), [
        'login' => (string) $user->id,
        'password' => '654321',
    ]);

    $this->assertGuest();
});

test('welcome screen pin lookup fails when multiple users share the same pin', function () {
    User::factory()->create([
        'pin' => '123456',
    ]);

    User::factory()->create([
        'pin' => '123456',
    ]);

    $this->post(route('login.store'), [
        'auth_mode' => 'pin_lookup',
        'login' => '123456',
        'password' => '123456',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    $this->assertGuest();
    $response->assertRedirect(route('welcome'));
});

test('users are rate limited', function () {
    $user = User::factory()->create();

    foreach (range(1, 5) as $attempt) {
        $this->postJson(route('login.store'), [
            'login' => (string) $user->id,
            'password' => '654321',
        ])->assertStatus(422);
    }

    $response = $this->postJson(route('login.store'), [
        'login' => (string) $user->id,
        'password' => '654321',
    ]);

    $response->assertStatus(429);
    $this->assertGuest();
});
