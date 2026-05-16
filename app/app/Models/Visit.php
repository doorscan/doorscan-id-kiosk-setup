<?php

namespace App\Models;

use Dyrynda\Database\Support\BindsOnUuid;
use Dyrynda\Database\Support\GeneratesUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Visit extends Model implements HasMedia
{
    use BindsOnUuid, GeneratesUuid;
    use HasFactory, SoftDeletes;
    use InteractsWithMedia;

    protected $fillable = [
        'scan_data',
        'uuid',
        'visit_at',
        'visitor_id',
    ];

    protected function casts(): array
    {
        return [
            'scan_data' => 'array',
            'uuid' => 'string',
            'visit_at' => 'datetime',
        ];
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photo')
            ->useDisk('public')
            ->singleFile()
            ->registerMediaConversions(function () {
                $this->addMediaConversion('thumb')
                    ->width(64)
                    ->height(48);
            });
        $this->addMediaCollection('scan_image')
            ->useDisk('public')
            ->singleFile();
        $this->addMediaCollection('extracted_face_image')
            ->useDisk('public')
            ->singleFile();
    }
}
