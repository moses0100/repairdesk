<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))->withRouting(web: __DIR__.'/../routes/web.php', commands: __DIR__.'/../routes/console.php', health: '/up')->withMiddleware(function (Middleware $m): void {
    $m->web(append: [HandleInertiaRequests::class, SecurityHeaders::class]);
})->withExceptions(function (Exceptions $e): void {})->create();
