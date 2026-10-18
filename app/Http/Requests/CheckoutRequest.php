<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role, ['manager', 'cashier']);
    }

    public function rules(): array
    {
        return ['idempotency_key' => 'required|uuid', 'items' => 'present|array|max:20', 'items.*.product_id' => 'required|integer|distinct', 'items.*.quantity' => 'required|integer|min:1|max:999', 'repair_id' => 'nullable|integer', 'method' => 'required|in:cash,transfer', 'tendered_satang' => 'required|integer|min:1|max:1000000000'];
    }
}
