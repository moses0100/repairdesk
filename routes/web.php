<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ShopController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'form'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
});
Route::middleware('auth')->group(function () {
    Route::get('/', fn () => redirect(auth()->user()->role === 'technician' ? '/repairs' : '/pos'));
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/pos', [ShopController::class, 'pos']);
    Route::post('/checkout', [ShopController::class, 'pay'])->middleware('throttle:30,1');
    Route::get('/inventory', [ShopController::class, 'inventory']);
    Route::post('/products', [ShopController::class, 'product']);
    Route::post('/products/{product}/adjust', [ShopController::class, 'adjust']);
    Route::get('/repairs', [ShopController::class, 'repairs']);
    Route::post('/repairs', [ShopController::class, 'repair']);
    Route::post('/repairs/{repair}', [ShopController::class, 'updateRepair']);
    Route::get('/sales', [ShopController::class, 'sales']);
    Route::get('/sales/{sale}', [ShopController::class, 'receipt']);
});
