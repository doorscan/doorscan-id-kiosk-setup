<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\PinUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    /**
     * Show the user's security settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/Security', [
            'hasPin' => filled($request->user()?->pin),
        ]);
    }

    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->password,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Password updated.')]);

        return back();
    }

    /**
     * Update the user's device PIN.
     */
    public function updatePin(PinUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'pin' => $request->pin,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('PIN updated.')]);

        return back();
    }
}
