<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('repairdesk:backup-data', function () {
    if (DB::connection()->getDriverName() !== 'sqlite') {
        $this->error('Use pg_dump for PostgreSQL backups.');

        return 1;
    }
    $directory = storage_path('app/private/backups');
    File::ensureDirectoryExists($directory);
    $path = $directory.'/repairdesk-'.now()->format('Ymd-His').'-'.bin2hex(random_bytes(3)).'.sqlite';
    DB::statement('VACUUM INTO '.DB::getPdo()->quote($path));
    $this->info($path);

    return 0;
})->purpose('Create a consistent, private SQLite data snapshot');
