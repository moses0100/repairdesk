<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $fillable = ['product_id', 'actor_id', 'sale_id', 'delta', 'reason'];

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
