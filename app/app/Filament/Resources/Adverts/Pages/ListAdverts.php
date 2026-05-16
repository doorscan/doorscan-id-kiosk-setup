<?php

namespace App\Filament\Resources\Adverts\Pages;

use App\Filament\Resources\Adverts\AdvertResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListAdverts extends ListRecords
{
    protected static string $resource = AdvertResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
