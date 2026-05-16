<?php

use App\Models\Advert;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('advert_views', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(Advert::class)->constrained();
            $table->dateTime('started_at');
            $table->dateTime('ended_at');
            $table->unsignedInteger('displayed_seconds');
            $table->timestamps();

            $table->index('started_at');
            $table->index(['advert_id', 'started_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advert_views');
    }
};
