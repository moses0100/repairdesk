<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = ['cashier_id', 'idempotency_key', 'request_hash', 'repair_id', 'total_satang', 'tendered_satang', 'change_satang', 'method'];

    protected function casts(): array
    {
        return ['total_satang' => 'integer', 'tendered_satang' => 'integer', 'change_satang' => 'integer'];
    }

    public function lines()
    {
        return $this->hasMany(SaleLine::class);
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function repair()
    {
        return $this->belongsTo(Repair::class);
    }
}
