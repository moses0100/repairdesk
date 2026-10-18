<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckoutRequest;
use App\Http\Requests\ProductRequest;
use App\Http\Requests\RepairRequest;
use App\Models\Product;
use App\Models\Repair;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\Checkout;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ShopController extends Controller
{
    private function staff()
    {
        abort_unless(in_array(auth()->user()->role, ['manager', 'cashier']), 403);
    }

    public function pos()
    {
        $this->staff();

        return Inertia::render('Workspace', ['page' => 'pos', 'products' => Product::where('active', true)->orderBy('name')->get(), 'readyRepairs' => Repair::where('status', 'ready')->whereDoesntHave('sale')->get(['id', 'device', 'price_satang'])]);
    }

    public function inventory()
    {
        abort_unless(auth()->user()->role === 'manager', 403);

        return Inertia::render('Workspace', ['page' => 'inventory', 'products' => Product::orderBy('id')->get(), 'movements' => StockMovement::with('actor:id,name')->latest('id')->limit(30)->get()]);
    }

    public function product(ProductRequest $r)
    {
        DB::transaction(function () use ($r) {
            $p = Product::create($r->validated());
            if ($p->stock) {
                StockMovement::create(['product_id' => $p->id, 'actor_id' => $r->user()->id, 'delta' => $p->stock, 'reason' => 'สต็อกเริ่มต้น']);
            }
        });

        return back()->with('success', 'เพิ่มสินค้าแล้ว');
    }

    public function adjust(Request $r, Product $product)
    {
        abort_unless($r->user()->role === 'manager', 403);
        $data = $r->validate(['delta' => 'required|integer|not_in:0|min:-100000|max:100000', 'reason' => 'required|string|min:3|max:200']);
        DB::transaction(function () use ($r, $product, $data) {
            $p = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();
            if ($p->stock + $data['delta'] < 0 || $p->stock + $data['delta'] > 100000) {
                throw ValidationException::withMessages(['delta' => 'จำนวนคงเหลือต้องอยู่ระหว่าง 0–100000']);
            }$p->increment('stock', $data['delta']);
            StockMovement::create(['product_id' => $p->id, 'actor_id' => $r->user()->id, 'delta' => $data['delta'], 'reason' => $data['reason']]);
        });

        return back()->with('success', 'ปรับสต็อกพร้อมบันทึกเหตุผลแล้ว');
    }

    public function pay(CheckoutRequest $r, Checkout $checkout)
    {
        $sale = $checkout->pay($r->user(), $r->validated());

        return redirect('/sales/'.$sale->id);
    }

    public function sales()
    {
        $this->staff();

        return Inertia::render('Workspace', ['page' => 'sales', 'sales' => Sale::with('cashier:id,name')->latest('id')->paginate(25), 'today' => Sale::where('created_at', '>=', now('Asia/Bangkok')->startOfDay()->utc())->sum('total_satang')]);
    }

    public function receipt(Sale $sale)
    {
        $this->staff();

        return Inertia::render('Receipt', ['sale' => $sale->load(['lines', 'cashier:id,name', 'repair:id,customer_name,device'])]);
    }

    public function repairs()
    {
        abort_unless(in_array(auth()->user()->role, ['manager', 'cashier', 'technician']), 403);

        return Inertia::render('Workspace', ['page' => 'repairs', 'repairs' => Repair::with(['assignee:id,name', 'sale:id,repair_id', 'events'])->when(auth()->user()->role === 'technician', fn ($q) => $q->where('assignee_id', auth()->id()))->latest('id')->paginate(20), 'technicians' => User::where('role', 'technician')->get(['id', 'name'])]);
    }

    public function repair(RepairRequest $r)
    {
        $data = $r->validated();
        if (! empty($data['assignee_id']) && ! User::whereKey($data['assignee_id'])->where('role', 'technician')->exists()) {
            throw ValidationException::withMessages(['assignee_id' => 'เลือกบัญชีช่าง']);
        }DB::transaction(function () use ($r, $data) {
            $job = Repair::create($data);
            $job->events()->create(['actor_id' => $r->user()->id, 'status' => 'received', 'note' => 'รับเครื่องซ่อม']);
        });

        return back()->with('success', 'รับเครื่องแล้ว');
    }

    public function updateRepair(Request $r, Repair $repair)
    {
        abort_unless(in_array($r->user()->role, ['manager', 'cashier', 'technician']), 403);
        $tech = $r->user()->role === 'technician';
        abort_if($tech && $repair->assignee_id !== $r->user()->id, 403);
        $data = $r->validate(['version' => 'required|integer|min:0', 'status' => ['required', Rule::in(['received', 'diagnosing', 'waiting_parts', 'ready', 'delivered', 'cancelled'])], 'note' => 'nullable|string|max:1000', 'price_satang' => [$tech ? 'prohibited' : 'nullable', 'integer', 'min:1', 'max:1000000000']]);
        DB::transaction(function () use ($r, $repair, $data, $tech) {
            $job = Repair::whereKey($repair->id)->lockForUpdate()->firstOrFail();
            if ($job->version !== $data['version']) {
                throw ValidationException::withMessages(['repair' => 'งานเปลี่ยนแล้ว กรุณาโหลดใหม่']);
            }
            $map = ['received' => ['diagnosing', 'cancelled'], 'diagnosing' => ['waiting_parts', 'ready', 'cancelled'], 'waiting_parts' => ['diagnosing', 'ready', 'cancelled'], 'ready' => ['diagnosing', 'delivered', 'cancelled'], 'delivered' => [], 'cancelled' => []];
            if ($data['status'] !== $job->status && ! in_array($data['status'], $map[$job->status])) {
                throw ValidationException::withMessages(['status' => 'ไม่สามารถเปลี่ยนสถานะตามลำดับนี้']);
            }
            if ($tech && in_array($data['status'], ['delivered', 'cancelled'])) {
                abort(403);
            }
            $paid = $job->sale()->exists();
            if ($paid && (($data['status'] !== $job->status && $data['status'] !== 'delivered') || isset($data['price_satang']))) {
                throw ValidationException::withMessages(['repair' => 'งานที่ชำระแล้วแก้ราคา/ย้อนสถานะไม่ได้']);
            }
            if ($data['status'] === 'delivered' && ! $paid) {
                throw ValidationException::withMessages(['status' => 'รับชำระค่าซ่อมก่อนส่งมอบ']);
            }
            if (in_array($job->status, ['delivered', 'cancelled'])) {
                throw ValidationException::withMessages(['repair' => 'งานสิ้นสุดแล้ว']);
            }
            $changes = ['status' => $data['status'], 'version' => $job->version + 1];
            if (isset($data['price_satang'])) {
                $changes['price_satang'] = $data['price_satang'];
            }
            $job->update($changes);
            $job->events()->create(['actor_id' => $r->user()->id, 'status' => $job->status, 'note' => $data['note'] ?? null]);
        });

        return back()->with('success', 'บันทึกความคืบหน้าแล้ว');
    }
}
