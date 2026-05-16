<?php

namespace App\Concerns;

trait PinValidationRules
{
    /**
     * Get the validation rules used to validate PINs.
     *
     * @return array<int, string>
     */
    protected function pinRules(): array
    {
        return ['required', 'string', 'digits:6', 'confirmed'];
    }

    /**
     * Get the validation messages used to validate PINs.
     *
     * @return array<string, string>
     */
    protected function pinMessages(): array
    {
        return [
            'pin.digits' => __('The PIN must be exactly 6 digits.'),
        ];
    }
}
