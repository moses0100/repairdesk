<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RepairEvent extends Model
{
    protected $fillable = ['repair_id', 'actor_id', 'status', 'note'];

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
