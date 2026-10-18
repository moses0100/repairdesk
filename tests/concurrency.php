<?php

use App\Models\Product;
use App\Models\SaleLine;
use App\Models\User;
use App\Services\Checkout;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Process\Process;

// Run only against a disposable PostgreSQL test database, after migrations.
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! app()->environment('testing') || config('database.default') !== 'pgsql' || ! str_ends_with(config('database.connections.pgsql.database'), '_test')) {
    throw new RuntimeException('Requires APP_ENV=testing and a PostgreSQL database ending in _test');
}
if (($argv[1] ?? '') === 'worker') {
    try {
        app(Checkout::class)->pay(User::findOrFail($argv[3]), ['idempotency_key' => (string) Str::uuid(), 'items' => [['product_id' => (int) $argv[2], 'quantity' => 1]], 'method' => 'cash', 'tendered_satang' => 10000]);
        exit(0);
    } catch (ValidationException) {
        exit(2);
    }
}
$users = collect([1, 2])->map(fn () => User::factory()->create(['role' => 'cashier']));
$product = Product::create(['sku' => 'RACE-'.Str::random(10), 'name' => 'Concurrency fixture', 'price_satang' => 10000, 'stock' => 1]);
$workers = $users->map(fn ($user) => new Process([PHP_BINARY, __FILE__, 'worker', (string) $product->id, (string) $user->id]));
$workers->each(fn ($worker) => $worker->start());
$codes = $workers->map(fn ($worker) => $worker->wait())->sort()->values()->all();
if ($codes !== [0, 2] || $product->fresh()->stock !== 0 || SaleLine::where('product_id', $product->id)->count() !== 1) {
    foreach ($workers as $worker) {
        fwrite(STDERR, $worker->getErrorOutput());
    }
    throw new RuntimeException('Concurrent stock claim failed');
}
echo "PASS: two cashiers, one item, one paid sale, stock zero.\n";
