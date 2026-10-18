<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Repair extends Model
{
    protected $fillable = ['customer_name', 'phone', 'device', 'serial', 'issue', 'status', 'assignee_id', 'price_satang', 'version'];

    protected function casts(): array
    {
        return ['price_satang' => 'integer', 'version' => 'integer'];
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function sale()
    {
        return $this->hasOne(Sale::class);
    }

    public function events()
    {
        return $this->hasMany(RepairEvent::class)->with('actor:id,name')->orderBy('id');
    }
}
