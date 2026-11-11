<?php
declare(strict_types=1);

/**
 * Koneksi PDO ke Supabase (PostgreSQL).
 *
 * ATTR_EMULATE_PREPARES = true  -> kompatibel dengan Supabase "Transaction pooler" (PgBouncer)
 * yang tidak mendukung server-side prepared statements. Query tetap aman karena
 * semua nilai dikirim lewat parameter terikat (bound parameters) PDO.
 */
final class Database
{
    private static ?PDO $pdo = null;
    private static ?array $config = null;

    public static function config(): array
    {
        return self::$config ??= require __DIR__ . '/../config/config.php';
    }

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $c = self::config()['db'];
            $dsn = $c['dsn'] ?? sprintf(
                'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
                $c['host'], $c['port'], $c['name'], $c['sslmode']
            );
            self::$pdo = new PDO($dsn, $c['user'], $c['password'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => true,
                PDO::ATTR_TIMEOUT            => 10,
            ]);
        }
        return self::$pdo;
    }
}

/** Akses cepat ke config: cfg('upload.dir') */
function cfg(string $path, mixed $default = null): mixed
{
    $v = Database::config();
    foreach (explode('.', $path) as $k) {
        if (!is_array($v) || !array_key_exists($k, $v)) {
            return $default;
        }
        $v = $v[$k];
    }
    return $v;
}
