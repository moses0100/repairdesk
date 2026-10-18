<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Repair;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class Checkout
{
    public function pay(User $actor, array $data): Sale
    {
        abort_unless(in_array($actor->role, ['manager', 'cashier']), 403);
        $items = collect($data['items'] ?? [])->sortBy('product_id')->values()->all();
        $payload = ['items' => $items, 'repair_id' => $data['repair_id'] ?? null, 'method' => $data['method'], 'tendered_satang' => $data['tendered_satang']];
        $hash = hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($actor, $data, $items, $hash) {
            // Serialize retries by cashier; product locks use a stable order across cashiers.
            User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $existing = Sale::where('cashier_id', $actor->id)->where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                if (! hash_equals($existing->request_hash, $hash)) {
                    $this->fail('คำขอชำระเดิมมีข้อมูลต่างกัน กรุณาเริ่มรายการใหม่');
                }

return $existing;
            }
            $products = Product::whereIn('id', array_column($items, 'product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $lines = [];
            $total = 0;
            foreach ($items as $item) {
                $p = $products->get($item['product_id']);
                if (! $p || ! $p->active || $p->stock < $item['quantity']) {
                    $this->fail('สินค้าไม่มีอยู่ ปิดขาย หรือสต็อกไม่พอ กรุณาตรวจรายการใหม่');
                }
                $amount = $p->price_satang * $item['quantity'];
                $total += $amount;
                $lines[] = ['product_id' => $p->id, 'description' => $p->name, 'quantity' => $item['quantity'], 'unit_satang' => $p->price_satang, 'total_satang' => $amount];
            }
            $repair = null;
            if (! empty($data['repair_id'])) {
                $repair = Repair::whereKey($data['repair_id'])->lockForUpdate()->first();
                if (! $repair || $repair->status !== 'ready' || ! $repair->price_satang || $repair->sale()->exists()) {
                    $this->fail('งานซ่อมยังไม่พร้อมรับเงิน หรือชำระแล้ว');
                }
                $total += $repair->price_satang;
                $lines[] = ['product_id' => null, 'description' => 'ค่าซ่อม R-'.str_pad($repair->id, 6, '0', STR_PAD_LEFT).' · '.$repair->device, 'quantity' => 1, 'unit_satang' => $repair->price_satang, 'total_satang' => $repair->price_satang];
            }
            if ($total < 1 || $total > 1000000000) {
                $this->fail('ยอดชำระต้องมากกว่า 0 และไม่เกิน 10 ล้านบาท');
            }
            $tendered = $data['tendered_satang'];
            if ($tendered < $total || ($data['method'] === 'transfer' && $tendered !== $total)) {
                $this->fail('เงินรับไม่ครบ หรือยอดโอนไม่ตรงกับยอดชำระ');
            }
            $sale = Sale::create(['cashier_id' => $actor->id, 'idempotency_key' => $data['idempotency_key'], 'request_hash' => $hash, 'repair_id' => $repair?->id, 'total_satang' => $total, 'tendered_satang' => $tendered, 'change_satang' => $tendered - $total, 'method' => $data['method']]);
            $sale->lines()->createMany($lines);
            foreach ($items as $item) {
                $p = $products[$item['product_id']];
                $p->decrement('stock', $item['quantity']);
                StockMovement::create(['product_id' => $p->id, 'actor_id' => $actor->id, 'sale_id' => $sale->id, 'delta' => -$item['quantity'], 'reason' => 'ขายสินค้า']);
            }
            if ($repair) {
                $repair->events()->create(['actor_id' => $actor->id, 'status' => $repair->status, 'note' => 'รับชำระบิล #'.$sale->id]);
            }

            return $sale;
        }, 5);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['checkout' => $message]);
    }
}
