<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Advert extends Model implements HasMedia
{
    use HasFactory, SoftDeletes;
    use InteractsWithMedia;

    protected $fillable = [
        'name',
        'active_from',
        'active_to',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'active_from' => 'datetime',
            'active_to' => 'datetime',
        ];
    }

    public function advertViews(): HasMany
    {
        return $this->hasMany(AdvertView::class);
    }

    /**
     * @return array{id: int, src: string}
     */
    public function toDisplayPayload(): array
    {
        return [
            'id' => $this->getKey(),
            'src' => $this->getFirstMediaUrl('advert', 'screen'),
        ];
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('advert')
            ->useDisk('public')
            ->singleFile()
            ->registerMediaConversions(function () {
                $this->addMediaConversion('thumb')
                    ->width(192)
                    ->height(128);
                $this->addMediaConversion('screen')
                    ->width(1920)
                    ->height(1280);
            });
    }

    #[Scope]
    protected function live(Builder $query): void
    {
        $now = now();

        $query
            ->whereNotNull('active_from')
            ->where('active_from', '<=', $now)
            ->where(function (Builder $query) use ($now): void {
                $query
                    ->whereNull('active_to')
                    ->orWhere('active_to', '>=', $now);
            });
    }
}
