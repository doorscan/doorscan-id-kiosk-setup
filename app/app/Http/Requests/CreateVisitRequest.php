<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateVisitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'visit_at' => ['required', 'date'],
            'photo' => ['required', 'string', 'starts_with:data:image/'],
            'scan' => ['required', 'array'],
            'scan.status' => ['required', 'string', Rule::in(['failed', 'succeeded'])],
            'scan.message' => ['nullable', 'string'],
            'scan.started_at' => ['nullable', 'date'],
            'scan.finished_at' => ['nullable', 'date'],
            'scan.data' => ['required', 'array'],
            'scan.data.first_name' => ['nullable', 'string'],
            'scan.data.last_name' => ['nullable', 'string'],
            'scan.data.dob' => ['nullable', 'date'],
            'scan.data.address' => ['nullable', 'string'],
            'scan.data.type' => ['nullable', 'string'],
            'scan.data.ocr_data_raw' => ['nullable', 'array'],
            'scan.images' => ['required', 'array'],
            'scan.images.scan_image' => ['nullable', 'string'],
            'scan.images.extracted_face_image' => ['nullable', 'string'],
        ];
    }
}
