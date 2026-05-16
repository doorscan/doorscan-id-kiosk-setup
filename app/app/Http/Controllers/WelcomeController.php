<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class WelcomeController extends Controller
{
    public function __invoke()
    {
        if (auth()->user()) {
            return redirect()->route('home');
        }

        return Inertia::render('Welcome');

    }
}
