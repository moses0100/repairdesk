<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RepairRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role, ['manager', 'cashier']);
    }

    public function rules(): array
    {
        return ['customer_name' => 'required|string|max:120', 'phone' => 'required|regex:/^[0-9+() -]{8,30}$/', 'device' => 'required|string|max:120', 'serial' => 'nullable|string|max:80', 'issue' => 'required|string|min:5|max:2000', 'assignee_id' => 'nullable|integer|exists:users,id'];
    }
}
