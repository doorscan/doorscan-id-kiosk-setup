<?php

use App\Http\Controllers\HomeController;
use App\Http\Controllers\LiveAdvertsController;
use App\Http\Controllers\RecordVisitController;
use App\Http\Controllers\StoreAdvertViewController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomeController::class)->name('welcome');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('home', HomeController::class)->name('home');
    Route::get('adverts/live', LiveAdvertsController::class)->name('adverts.live');
    Route::post('adverts/views', StoreAdvertViewController::class)->name('adverts.views');

    Route::post('visit', RecordVisitController::class)->name('visit.record');
});

require __DIR__.'/settings.php';
