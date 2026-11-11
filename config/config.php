<?php
declare(strict_types=1);

/**
 * Konfigurasi aplikasi. Nilai diambil dari file .env (atau variabel environment hosting).
 * Jangan menulis kredensial langsung di file ini.
 */
return [
    'app' => [
        'timezone' => env('APP_TIMEZONE', 'Asia/Jakarta'),
        'user'     => env('APP_USER', 'admin'),
        'password' => env('APP_PASSWORD'),          // kosong = login dimatikan
        'debug'    => env('APP_DEBUG') === '1',
    ],
    'db' => [
        'dsn'      => env('DB_DSN'),                // opsional: DSN penuh, menimpa pengaturan di bawah
        'host'     => env('DB_HOST', 'localhost'),
        'port'     => env('DB_PORT', '5432'),
        'name'     => env('DB_NAME', 'postgres'),
        'user'     => env('DB_USER'),
        'password' => env('DB_PASSWORD'),
        'sslmode'  => env('DB_SSLMODE', 'require'),
    ],
    'upload' => [
        'dir'       => dirname(__DIR__) . '/public/uploads',
        'url'       => 'uploads',
        'max_bytes' => 2 * 1024 * 1024,
    ],
];
