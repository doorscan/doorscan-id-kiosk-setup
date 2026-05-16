<?php

namespace App\Jobs;

use App\Models\Visit;
use App\Models\Visitor;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Arr;

class StoreVisitJob implements ShouldQueue
{
    use Queueable;

    /**
     * @param  array<string, mixed>  $scan
     */
    public function __construct(
        public string $visitAt,
        public string $photo,
        public array $scan,
    ) {}

    public function handle(): void
    {
        $visitor = $this->createVisitor();

        $visit = Visit::query()->create([
            'scan_data' => Arr::except($this->scan, ['images']),
            'visit_at' => CarbonImmutable::parse($this->visitAt),
            'visitor_id' => $visitor?->id,
        ]);

        $photoExtension = str_contains($this->photo, 'image/png')
            ? 'png'
            : (str_contains($this->photo, 'image/webp') ? 'webp' : 'jpg');

        $visit->addMediaFromBase64($this->photo, 'image/jpeg', 'image/png', 'image/webp')
            ->usingFileName("visit-{$visit->uuid}.{$photoExtension}")
            ->toMediaCollection('photo');

        $this->storeScanImage(
            $visit,
            $this->scan['images']['scan_image'] ?? null,
            'scan_image',
            "visit-{$visit->uuid}-document",
        );
        $this->storeScanImage(
            $visit,
            $this->scan['images']['extracted_face_image'] ?? null,
            'extracted_face_image',
            "visit-{$visit->uuid}-face",
        );
    }

    private function createVisitor(): ?Visitor
    {
        $dateOfBirth = Arr::get($this->scan, 'data.dob');
        $visitorAttributes = [
            'date_of_birth' => $dateOfBirth ? CarbonImmutable::parse($dateOfBirth) : null,
            'first_name' => Arr::get($this->scan, 'data.first_name'),
            'last_name' => Arr::get($this->scan, 'data.last_name'),
        ];

        if (Arr::whereNotNull($visitorAttributes) === []) {
            return null;
        }

        return Visitor::query()->create($visitorAttributes);
    }

    private function storeScanImage(
        Visit $visit,
        mixed $imageSource,
        string $collection,
        string $filenamePrefix,
    ): void {
        if (! is_string($imageSource) || $imageSource === '') {
            return;
        }

        if (str_starts_with($imageSource, 'data:image/')) {
            $extension = str_contains($imageSource, 'image/png')
                ? 'png'
                : (str_contains($imageSource, 'image/webp') ? 'webp' : 'jpg');

            $visit->addMediaFromBase64(
                $imageSource,
                'image/jpeg',
                'image/png',
                'image/webp',
            )
                ->usingFileName("{$filenamePrefix}.{$extension}")
                ->toMediaCollection($collection);

            return;
        }

        $publicPath = parse_url($imageSource, PHP_URL_PATH);

        if (! is_string($publicPath) || $publicPath === '') {
            return;
        }

        $absolutePath = public_path(ltrim($publicPath, '/'));

        if (! is_file($absolutePath)) {
            return;
        }

        $extension = pathinfo($absolutePath, PATHINFO_EXTENSION) ?: 'jpg';

        $visit->addMedia($absolutePath)
            ->usingFileName("{$filenamePrefix}.{$extension}")
            ->toMediaCollection($collection);
    }
}
