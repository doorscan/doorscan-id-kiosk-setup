<?php

namespace App\Jobs;

use App\Models\AdvertView;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class StoreAdvertViewJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $advertId,
        public string $startedAt,
        public string $endedAt,
        public int $displayedSeconds,
    ) {}

    public function handle(): void
    {
        AdvertView::query()->create([
            'advert_id' => $this->advertId,
            'started_at' => CarbonImmutable::parse($this->startedAt),
            'ended_at' => CarbonImmutable::parse($this->endedAt),
            'displayed_seconds' => $this->displayedSeconds,
        ]);
    }
}
