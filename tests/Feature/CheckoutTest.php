<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function cashier(string $role = 'cashier'): User
    {
        return User::factory()->create(['role' => $role]);
    }

    private function product(int $stock = 5, int $price = 15900): Product
    {
        return Product::create(['sku' => Str::random(10), 'name' => 'เคสตัวอย่าง', 'price_satang' => $price, 'stock' => $stock]);
    }

    private function payload(Product $p, array $extra = []): array
    {
        return array_replace(['idempotency_key' => (string) Str::uuid(), 'items' => [['product_id' => $p->id, 'quantity' => 2]], 'repair_id' => null, 'method' => 'cash', 'tendered_satang' => 50000], $extra);
    }

    public function test_cash_sale_uses_server_price_and_keeps_an_immutable_snapshot(): void
    {
        $p = $this->product();
        $data = $this->payload($p);
        $data['items'][0]['unit_satang'] = 1;
        $this->actingAs($this->cashier())->post('/checkout', $data)->assertRedirect('/sales/1');
        $sale = Sale::firstOrFail();
        $this->assertSame(31800, $sale->total_satang);
        $this->assertSame(18200, $sale->change_satang);
        $this->assertSame(3, $p->fresh()->stock);
        $this->assertSame(-2, StockMovement::first()->delta);
        $p->update(['name' => 'ชื่อใหม่', 'price_satang' => 99900]);
        $this->assertSame('เคสตัวอย่าง', $sale->lines()->first()->description);
        $this->assertSame(15900, $sale->lines()->first()->unit_satang);
    }

    public function test_identical_retry_does_not_charge_or_decrement_twice(): void
    {
        $p = $this->product();
        $data = $this->payload($p);
        $this->actingAs($this->cashier());
        $this->post('/checkout', $data)->assertRedirect('/sales/1');
        $this->post('/checkout', $data)->assertRedirect('/sales/1');
        $this->assertDatabaseCount('sales', 1);
        $this->assertDatabaseCount('stock_movements', 1);
        $this->assertSame(3, $p->fresh()->stock);
    }

    public function test_reusing_key_with_different_payload_is_rejected(): void
    {
        $p = $this->product();
        $data = $this->payload($p);
        $this->actingAs($this->cashier())->post('/checkout', $data);
        $data['tendered_satang'] = 60000;
        $this->post('/checkout', $data)->assertSessionHasErrors('checkout');
        $this->assertDatabaseCount('sales', 1);
        $this->assertSame(3, $p->fresh()->stock);
    }

    public function test_insufficient_stock_rolls_back_the_entire_basket(): void
    {
        $p = $this->product();
        $other = $this->product(0);
        $data = $this->payload($p);
        $data['items'][] = ['product_id' => $other->id, 'quantity' => 1];
        $this->actingAs($this->cashier())->post('/checkout', $data)->assertSessionHasErrors('checkout');
        $this->assertDatabaseCount('sales', 0);
        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertSame(5, $p->fresh()->stock);
    }

    public function test_insufficient_cash_and_inexact_transfer_do_not_create_sales(): void
    {
        $p = $this->product();
        $this->actingAs($this->cashier());
        foreach ([['cash', 100], ['transfer', 50000]] as [$method,$amount]) {
            $this->post('/checkout', $this->payload($p, ['method' => $method, 'tendered_satang' => $amount]))->assertSessionHasErrors('checkout');
        }$this->assertDatabaseCount('sales', 0);
        $this->assertSame(5, $p->fresh()->stock);
    }

    public function test_exact_transfer_has_no_change(): void
    {
        $p = $this->product();
        $this->actingAs($this->cashier())->post('/checkout', $this->payload($p, ['method' => 'transfer', 'tendered_satang' => 31800]))->assertRedirect('/sales/1');
        $this->assertSame(0, Sale::first()->change_satang);
    }

    public function test_duplicate_lines_empty_cart_and_zero_quantity_are_rejected(): void
    {
        $p = $this->product();
        $this->actingAs($this->cashier());
        $data = $this->payload($p);
        $data['items'][] = $data['items'][0];
        $this->post('/checkout', $data)->assertSessionHasErrors();
        $this->post('/checkout', $this->payload($p, ['items' => []]))->assertSessionHasErrors('checkout');
        $data = $this->payload($p);
        $data['items'][0]['quantity'] = 0;
        $this->post('/checkout', $data)->assertSessionHasErrors();
        $this->assertDatabaseCount('sales', 0);
    }

    public function test_technician_cannot_sell_or_manage_inventory(): void
    {
        $p = $this->product();
        $this->actingAs($this->cashier('technician'))->post('/checkout', $this->payload($p))->assertForbidden();
        $this->get('/pos')->assertForbidden();
        $this->get('/inventory')->assertForbidden();
        $this->assertDatabaseCount('sales', 0);
    }

    public function test_manager_stock_adjustment_records_actor_and_cannot_go_negative(): void
    {
        $p = $this->product();
        $user = $this->cashier('manager');
        $this->actingAs($user)->post('/products/'.$p->id.'/adjust', ['delta' => -6, 'reason' => 'ตรวจนับ'])->assertSessionHasErrors('delta');
        $this->assertSame(5, $p->fresh()->stock);
        $this->post('/products/'.$p->id.'/adjust', ['delta' => 3, 'reason' => 'รับสินค้า'])->assertRedirect();
        $this->assertSame(8, $p->fresh()->stock);
        $this->assertDatabaseHas('stock_movements', ['actor_id' => $user->id, 'delta' => 3]);
    }

    public function test_cashier_cannot_create_products_or_adjust_stock(): void
    {
        $p = $this->product();
        $this->actingAs($this->cashier())->post('/products', [])->assertForbidden();
        $this->post('/products/'.$p->id.'/adjust', ['delta' => 1, 'reason' => 'รับสินค้า'])->assertForbidden();
    }
}
