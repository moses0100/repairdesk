<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->role === 'manager';
    }

    public function rules(): array
    {
        return ['sku' => 'required|string|max:50|unique:products', 'barcode' => 'nullable|string|max:50|unique:products', 'name' => 'required|string|min:2|max:150', 'price_satang' => 'required|integer|min:1|max:1000000000', 'stock' => 'required|integer|min:0|max:100000'];
    }
}
