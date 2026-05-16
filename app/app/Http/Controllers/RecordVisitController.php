<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateVisitRequest;
use App\Jobs\StoreVisitJob;
use Illuminate\Http\JsonResponse;

class RecordVisitController extends Controller
{
    public function __invoke(CreateVisitRequest $request): JsonResponse
    {
        /** @var array{visit_at: string, photo: string, scan: array<string, mixed>} $validated */
        $validated = $request->validated();

        StoreVisitJob::dispatchAfterResponse(
            visitAt: (string) $validated['visit_at'],
            photo: (string) $validated['photo'],
            scan: $validated['scan'],
        );

        return response()->json(status: 202);
    }
}
