<?php

namespace App\Http\Controllers;

use App\Models\Advert;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        $initialAdvert = Advert::live()->whereHas('media')->inRandomOrder()->first();

        return inertia('Home', [
            'initialAdvert' => $initialAdvert?->toDisplayPayload(),
        ]);
    }
}
