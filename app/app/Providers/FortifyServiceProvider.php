<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::authenticateUsing(function (Request $request): ?User {
            $login = trim((string) $request->input(Fortify::username()));
            $secret = (string) $request->input('password');

            if ($login === '' || $secret === '') {
                return null;
            }

            if ($request->input('auth_mode') === 'pin_lookup' && $login === $secret) {
                $user = $this->findUserForPinLookup($secret);

                if (! $user) {
                    return null;
                }

                if (Hash::needsRehash($user->pin)) {
                    $user->forceFill([
                        'pin' => $secret,
                    ])->save();
                }

                return $user;
            }

            if (filter_var($login, FILTER_VALIDATE_EMAIL)) {
                $user = User::query()
                    ->where('email', Str::lower($login))
                    ->first();

                if (! $user || ! Hash::check($secret, $user->password)) {
                    return null;
                }

                if (Hash::needsRehash($user->password)) {
                    $user->forceFill([
                        'password' => $secret,
                    ])->save();
                }

                return $user;
            }

            if (! ctype_digit($login)) {
                return null;
            }

            $user = User::query()->find((int) $login);

            if (! $user || blank($user->pin) || ! Hash::check($secret, $user->pin)) {
                return null;
            }

            if (Hash::needsRehash($user->pin)) {
                $user->forceFill([
                    'pin' => $secret,
                ])->save();
            }

            return $user;
        });
    }

    /**
     * Resolve a user from a welcome-screen PIN lookup.
     */
    private function findUserForPinLookup(string $pin): ?User
    {
        $matchedUser = null;

        foreach (User::query()->whereNotNull('pin')->cursor() as $user) {
            if (! Hash::check($pin, $user->pin)) {
                continue;
            }

            if ($matchedUser !== null) {
                return null;
            }

            $matchedUser = $user;
        }

        return $matchedUser;
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower((string) $request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
