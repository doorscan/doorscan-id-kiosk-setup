<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PinValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PinUpdateRequest extends FormRequest
{
    use PinValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'pin_current_password' => ['required', 'string', 'current_password'],
            'pin' => $this->pinRules(),
        ];
    }

    /**
     * Get the validation messages that apply to the request.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->pinMessages();
    }
}
