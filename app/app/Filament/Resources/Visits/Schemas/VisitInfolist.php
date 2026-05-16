<?php

namespace App\Filament\Resources\Visits\Schemas;

use Filament\Infolists\Components\SpatieMediaLibraryImageEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class VisitInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('visit_at')->label('Visit At')->dateTime(),

                SpatieMediaLibraryImageEntry::make('photo')
                    ->collection('photo'),

            ]);
    }
}
