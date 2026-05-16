<?php

namespace App\Filament\Resources\Adverts\Pages;

use App\Filament\Resources\Adverts\AdvertResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\ForceDeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Resources\Pages\EditRecord;

class EditAdvert extends EditRecord
{
    protected static string $resource = AdvertResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
            ForceDeleteAction::make(),
            RestoreAction::make(),
        ];
    }
}
