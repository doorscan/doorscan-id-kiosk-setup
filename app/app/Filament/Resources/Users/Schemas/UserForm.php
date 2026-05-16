<?php

namespace App\Filament\Resources\Users\Schemas;

use App\Models\User;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Validation\Rules\Password;

class UserForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('User details')
                    ->schema([
                        TextInput::make('name')
                            ->required()
                            ->maxLength(255),
                        TextInput::make('email')
                            ->label('Email address')
                            ->email()
                            ->required()
                            ->maxLength(255)
                            ->unique(User::class, 'email', ignoreRecord: true),
                        DateTimePicker::make('email_verified_at')
                            ->label('Email verified at')
                            ->seconds(false)
                            ->helperText('Leave empty to keep the address unverified.'),
                    ])
                    ->columns(2),
                Section::make('Security')
                    ->schema([
                        TextInput::make('password')
                            ->password()
                            ->revealable()
                            ->autocomplete('new-password')
                            ->required(fn (string $operation): bool => $operation === 'create')
                            ->rules([Password::default()], fn (?string $state): bool => filled($state))
                            ->confirmed(fn (?string $state): bool => filled($state))
                            ->dehydrated(fn (?string $state): bool => filled($state))
                            ->formatStateUsing(static fn (): ?string => null)
                            ->helperText(fn (string $operation): string => $operation === 'create'
                                ? 'Set the user password.'
                                : 'Leave blank to keep the existing password.'),
                        TextInput::make('password_confirmation')
                            ->label('Confirm password')
                            ->password()
                            ->revealable()
                            ->autocomplete('new-password')
                            ->dehydrated(false),
                        TextInput::make('pin')
                            ->label('6-digit PIN')
                            ->password()
                            ->revealable()
                            ->autocomplete(false)
                            ->inputMode('numeric')
                            ->required(fn (string $operation): bool => $operation === 'create')
                            ->rule('digits:6', fn (?string $state): bool => filled($state))
                            ->confirmed(fn (?string $state): bool => filled($state))
                            ->dehydrated(fn (?string $state): bool => filled($state))
                            ->formatStateUsing(static fn (): ?string => null)
                            ->helperText(fn (string $operation): string => $operation === 'create'
                                ? 'Exactly 6 digits.'
                                : 'Leave blank to keep the existing PIN.'),
                        TextInput::make('pin_confirmation')
                            ->label('Confirm PIN')
                            ->password()
                            ->revealable()
                            ->autocomplete(false)
                            ->inputMode('numeric')
                            ->dehydrated(false),
                    ])
                    ->columns(2),
            ]);
    }
}
