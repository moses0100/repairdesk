<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleLine extends Model
{
    protected $fillable = ['sale_id', 'product_id', 'description', 'quantity', 'unit_satang', 'total_satang'];

    public $timestamps = false;

    protected function casts(): array
    {
        return ['unit_satang' => 'integer', 'total_satang' => 'integer', 'quantity' => 'integer'];
    }
}
