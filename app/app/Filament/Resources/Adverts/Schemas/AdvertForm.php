<?php

namespace App\Filament\Resources\Adverts\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\SpatieMediaLibraryFileUpload;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class AdvertForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                Textarea::make('description')
                    ->columnSpanFull(),
                SpatieMediaLibraryFileUpload::make('advert')
                    ->collection('advert')
                    ->disk('public')
                    ->conversion('thumb')
                    ->image()
                    ->columnSpanFull(),
                DateTimePicker::make('active_from')->nullable(),
                DateTimePicker::make('active_to')->nullable(),

            ]);
    }
}
