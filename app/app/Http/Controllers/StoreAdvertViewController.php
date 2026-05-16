<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAdvertViewRequest;
use App\Jobs\StoreAdvertViewJob;
use Illuminate\Http\JsonResponse;

class StoreAdvertViewController extends Controller
{
    public function __invoke(StoreAdvertViewRequest $request): JsonResponse
    {
        /** @var array{advert_id: mixed, started_at: mixed, ended_at: mixed, displayed_seconds: mixed} $validated */
        $validated = $request->validated();

        StoreAdvertViewJob::dispatch(
            advertId: (int) $validated['advert_id'],
            startedAt: (string) $validated['started_at'],
            endedAt: (string) $validated['ended_at'],
            displayedSeconds: (int) $validated['displayed_seconds'],
        );

        return response()->json(status: 202);
    }
}
