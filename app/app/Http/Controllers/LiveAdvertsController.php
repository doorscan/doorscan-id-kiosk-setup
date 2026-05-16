<?php

namespace App\Http\Controllers;

use App\Models\Advert;
use Illuminate\Http\JsonResponse;

class LiveAdvertsController extends Controller
{
    private const ADVERT_DISPLAY_TIME_IN_SECONDS = 60;

    public function __invoke(): JsonResponse
    {
        $adverts = Advert::live()
            ->whereHas('media')
            ->inRandomOrder()
            ->get()
            ->map(fn (Advert $advert): array => $advert->toDisplayPayload())
            ->filter()
            ->values()
            ->all();

        return response()->json([
            'adverts' => $adverts,
            'advert_display_time_in_seconds' => self::ADVERT_DISPLAY_TIME_IN_SECONDS,
        ]);
    }
}
