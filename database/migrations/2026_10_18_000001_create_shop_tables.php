<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->string('role')->default('cashier'));
        Schema::create('products', function (Blueprint $t) {
            $t->id();
            $t->string('sku')->unique();
            $t->string('barcode')->nullable()->unique();
            $t->string('name');
            $t->bigInteger('price_satang');
            $t->integer('stock')->default(0);
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
        Schema::create('repairs', function (Blueprint $t) {
            $t->id();
            $t->string('customer_name');
            $t->string('phone', 30);
            $t->string('device');
            $t->string('serial')->nullable();
            $t->text('issue');
            $t->string('status')->default('received')->index();
            $t->foreignId('assignee_id')->nullable()->constrained('users');
            $t->bigInteger('price_satang')->nullable();
            $t->integer('version')->default(0);
            $t->timestamps();
        });
        Schema::create('sales', function (Blueprint $t) {
            $t->id();
            $t->foreignId('cashier_id')->constrained('users');
            $t->uuid('idempotency_key');
            $t->string('request_hash', 64);
            $t->foreignId('repair_id')->nullable()->unique()->constrained('repairs');
            $t->bigInteger('total_satang');
            $t->bigInteger('tendered_satang');
            $t->bigInteger('change_satang');
            $t->string('method');
            $t->timestamps();
            $t->unique(['cashier_id', 'idempotency_key']);
        });
        Schema::create('sale_lines', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sale_id')->constrained('sales');
            $t->foreignId('product_id')->nullable()->constrained('products');
            $t->string('description');
            $t->integer('quantity');
            $t->bigInteger('unit_satang');
            $t->bigInteger('total_satang');
        });
        Schema::create('stock_movements', function (Blueprint $t) {
            $t->id();
            $t->foreignId('product_id')->constrained('products');
            $t->foreignId('actor_id')->constrained('users');
            $t->foreignId('sale_id')->nullable()->constrained('sales');
            $t->integer('delta');
            $t->string('reason');
            $t->timestamps();
        });
        Schema::create('repair_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('repair_id')->constrained('repairs');
            $t->foreignId('actor_id')->constrained('users');
            $t->string('status');
            $t->text('note')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['repair_events', 'stock_movements', 'sale_lines', 'sales', 'repairs', 'products'] as $table) {
            Schema::dropIfExists($table);
        } Schema::table('users', fn (Blueprint $t) => $t->dropColumn('role'));
    }
};
