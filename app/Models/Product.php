<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = ['sku', 'barcode', 'name', 'price_satang', 'stock', 'active'];

    protected function casts(): array
    {
        return ['price_satang' => 'integer', 'stock' => 'integer', 'active' => 'boolean'];
    }
}
