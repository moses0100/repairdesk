<?php

namespace Tests\Feature;

use App\Models\Repair;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class RepairTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_roles_cannot_access_or_modify_repair_work(): void
    {
        $job = $this->job();
        $this->actingAs(User::factory()->create(['role' => 'unknown']))->get('/repairs')->assertForbidden();
        $this->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'diagnosing'])->assertForbidden();
    }

    private function job(): Repair
    {
        return Repair::create(['customer_name' => 'ลูกค้าทดสอบ', 'phone' => '0800000000', 'device' => 'มือถือทดสอบ', 'issue' => 'หน้าจอเสีย']);
    }

    public function test_repair_cannot_skip_status_or_deliver_before_payment(): void
    {
        $job = $this->job();
        $this->actingAs(User::factory()->create(['role' => 'manager']))->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'ready'])->assertSessionHasErrors('status');
        $this->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'diagnosing', 'price_satang' => 100000])->assertRedirect();
        $this->post('/repairs/'.$job->id, ['version' => 1, 'status' => 'ready'])->assertRedirect();
        $this->post('/repairs/'.$job->id, ['version' => 2, 'status' => 'delivered'])->assertSessionHasErrors('status');
        $this->assertSame('ready', $job->fresh()->status);
    }

    public function test_payment_enables_delivery_and_rejects_double_payment(): void
    {
        $job = $this->job();
        $job->update(['status' => 'ready', 'price_satang' => 100000]);
        $this->actingAs(User::factory()->create(['role' => 'cashier']));
        $payload = ['idempotency_key' => (string) Str::uuid(), 'items' => [], 'repair_id' => $job->id, 'method' => 'cash', 'tendered_satang' => 100000];
        $this->post('/checkout', $payload)->assertRedirect('/sales/'.Sale::sole()->id);
        $payload['idempotency_key'] = (string) Str::uuid();
        $this->post('/checkout', $payload)->assertSessionHasErrors('checkout');
        $this->assertDatabaseCount('sales', 1);
        $this->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'delivered'])->assertRedirect();
        $this->assertSame('delivered', $job->fresh()->status);
    }

    public function test_stale_repair_version_does_not_overwrite_newer_work(): void
    {
        $job = $this->job();
        $this->actingAs(User::factory()->create(['role' => 'manager']))->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'diagnosing'])->assertRedirect();
        $this->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'cancelled'])->assertSessionHasErrors('repair');
        $this->assertSame('diagnosing', $job->fresh()->status);
    }

    public function test_technician_only_sees_assigned_jobs_and_cannot_change_prices(): void
    {
        $job = $this->job();
        $tech = User::factory()->create(['role' => 'technician']);
        $this->actingAs($tech)->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'diagnosing'])->assertForbidden();
        $job->update(['assignee_id' => $tech->id]);
        $this->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'diagnosing', 'price_satang' => 10])->assertSessionHasErrors('price_satang');
        $this->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'diagnosing'])->assertRedirect();
        $this->assertNull($job->fresh()->price_satang);
    }

    public function test_paid_price_is_immutable_and_cancelled_work_cannot_reopen(): void
    {
        $job = $this->job();
        $this->actingAs(User::factory()->create(['role' => 'manager']));
        $job->update(['status' => 'ready', 'price_satang' => 10000]);
        $this->post('/checkout', ['idempotency_key' => (string) Str::uuid(), 'items' => [], 'repair_id' => $job->id, 'method' => 'cash', 'tendered_satang' => 10000])->assertRedirect();
        $this->post('/repairs/'.$job->id, ['version' => 0, 'status' => 'ready', 'price_satang' => 20000])->assertSessionHasErrors('repair');
        $this->assertSame(10000, $job->fresh()->price_satang);
        $other = $this->job();
        $other->update(['status' => 'cancelled']);
        $this->post('/repairs/'.$other->id, ['version' => 0, 'status' => 'diagnosing'])->assertSessionHasErrors();
    }
}
