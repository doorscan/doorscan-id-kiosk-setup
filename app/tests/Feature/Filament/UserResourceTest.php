<?php

use App\Filament\Resources\Users\Pages\CreateUser;
use App\Filament\Resources\Users\Pages\EditUser;
use App\Filament\Resources\Users\Pages\ListUsers;
use App\Models\User;
use Filament\Facades\Filament;
use Illuminate\Support\Facades\Hash;
use Livewire\Livewire;

beforeEach(function (): void {
    Filament::setCurrentPanel('admin');
});

test('an admin can see users in the resource table', function () {
    $admin = User::factory()->create();
    $users = User::factory()->count(2)->create();

    $this->actingAs($admin);

    Livewire::test(ListUsers::class)
        ->assertCanSeeTableRecords($users);
});

test('an admin can create a user with a password and pin', function () {
    $this->actingAs(User::factory()->create());

    Livewire::test(CreateUser::class)
        ->fillForm([
            'name' => 'Filament User',
            'email' => 'filament@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'pin' => '654321',
            'pin_confirmation' => '654321',
        ])
        ->call('create')
        ->assertHasNoFormErrors()
        ->assertNotified()
        ->assertRedirect();

    $user = User::query()
        ->where('email', 'filament@example.com')
        ->first();

    expect($user)->not->toBeNull();
    expect(Hash::check('Password123!', $user->password))->toBeTrue();
    expect(Hash::check('654321', $user->pin))->toBeTrue();
});

test('a user pin must be exactly six digits', function () {
    $this->actingAs(User::factory()->create());

    Livewire::test(CreateUser::class)
        ->fillForm([
            'name' => 'Invalid Pin User',
            'email' => 'invalid-pin@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'pin' => '12345',
            'pin_confirmation' => '12345',
        ])
        ->call('create')
        ->assertHasFormErrors([
            'pin' => ['digits'],
        ]);
});

test('editing a user keeps the existing password and pin when the fields are left blank', function () {
    $this->actingAs(User::factory()->create());

    $user = User::factory()->create([
        'name' => 'Original User',
        'email' => 'original@example.com',
        'password' => 'ExistingPassword123!',
        'pin' => '112233',
    ]);

    $originalPasswordHash = $user->password;
    $originalPinHash = $user->pin;

    Livewire::test(EditUser::class, ['record' => $user->getKey()])
        ->fillForm([
            'name' => 'Updated User',
            'password' => '',
            'password_confirmation' => '',
            'pin' => '',
            'pin_confirmation' => '',
        ])
        ->call('save')
        ->assertHasNoFormErrors()
        ->assertNotified();

    $user->refresh();

    expect($user->name)->toBe('Updated User');
    expect($user->password)->toBe($originalPasswordHash);
    expect($user->pin)->toBe($originalPinHash);
});
