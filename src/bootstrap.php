<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Repositories.php';
require_once __DIR__ . '/controllers.php';

load_env(dirname(__DIR__) . '/.env');
date_default_timezone_set(env('APP_TIMEZONE', 'Asia/Jakarta'));

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
      || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => $https]);
session_start();

ini_set('display_errors', env('APP_DEBUG') === '1' ? '1' : '0');

set_exception_handler(function (Throwable $e): void {
    error_log((string)$e);
    $msg = env('APP_DEBUG') === '1'
        ? $e->getMessage()
        : 'Terjadi kesalahan pada server. Periksa konfigurasi database (.env) dan log server.';
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo '<!doctype html><meta charset="utf-8"><title>Error</title>'
       . '<body style="font-family:sans-serif;padding:2rem"><h2>Terjadi kesalahan</h2><p>' . e($msg) . '</p></body>';
});
