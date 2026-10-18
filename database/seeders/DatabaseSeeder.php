<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Repair;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            throw new \RuntimeException('Fictional demo seeding is local/testing only');
        }
        DB::transaction(function () {
            $users = [];
            foreach (['manager' => 'เจ้าของร้านตัวอย่าง', 'cashier' => 'พนักงานขายตัวอย่าง', 'technician' => 'ช่างตัวอย่าง'] as $role => $name) {
                $users[$role] = User::firstOrCreate(['email' => $role.'@repairdesk.test'], ['name' => $name, 'role' => $role, 'password' => 'RepairDesk-demo-2026']);
            }
            foreach ([['CASE-01', '885000000001', 'เคสใสกันกระแทก', 15900, 18], ['CABLE-C', '885000000002', 'สายชาร์จ USB-C', 19900, 24], ['FILM-01', '885000000003', 'ฟิล์มกระจกนิรภัย', 9900, 32], ['ADAPTER', '885000000004', 'หัวชาร์จ 20W', 39000, 12], ['HOLDER', '885000000005', 'ขาตั้งโทรศัพท์', 12900, 8], ['CLEAN', '885000000006', 'ชุดทำความสะอาด', 7900, 15]] as [$sku,$barcode,$name,$price,$stock]) {
                $p = Product::firstOrCreate(['sku' => $sku], ['barcode' => $barcode, 'name' => $name, 'price_satang' => $price, 'stock' => $stock]);
                if ($p->wasRecentlyCreated) {
                    StockMovement::create(['product_id' => $p->id, 'actor_id' => $users['manager']->id, 'delta' => $stock, 'reason' => 'สินค้าเดโม']);
                }
            }
            $r = Repair::firstOrCreate(['serial' => 'DEMO-001'], ['customer_name' => 'ลูกค้าตัวอย่าง', 'phone' => '0800000000', 'device' => 'โทรศัพท์รุ่นตัวอย่าง', 'issue' => 'หน้าจอแตก ต้องการเปลี่ยนจอ', 'assignee_id' => $users['technician']->id, 'status' => 'received']);
            if ($r->wasRecentlyCreated) {
                $r->events()->create(['actor_id' => $users['manager']->id, 'status' => 'received', 'note' => 'ข้อมูลสมมติสำหรับทดลอง']);
            }
        });
    }
}
