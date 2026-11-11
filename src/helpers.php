<?php
declare(strict_types=1);

/* ---------- Environment ---------- */

function load_env(string $file): void
{
    if (!is_file($file)) {
        return;
    }
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v);
        if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && $v[-1] === $v[0]) {
            $v = substr($v, 1, -1);
        }
        if (getenv($k) === false) {   // variabel server (hosting) menang atas .env
            $_ENV[$k] = $v;
            putenv("$k=$v");
        }
    }
}

function env(string $key, ?string $default = null): ?string
{
    $v = $_ENV[$key] ?? getenv($key);
    return ($v === false || $v === null || $v === '') ? $default : (string)$v;
}

/* ---------- Output & URL ---------- */

function e(mixed $v): string
{
    return htmlspecialchars((string)$v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function url(string $route = 'dashboard', array $params = []): string
{
    return 'index.php?' . http_build_query(['r' => $route] + $params);
}

function redirect(string $route, array $params = []): never
{
    header('Location: ' . url($route, $params));
    exit;
}

function abort(int $code, string $msg = ''): never
{
    http_response_code($code);
    $title = $code === 404 ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan';
    render('error', ['code' => $code, 'title' => $title, 'msg' => $msg]);
    exit;
}

/* ---------- Format ---------- */

function rupiah(float|int|string|null $n): string
{
    return number_format((float)$n, 0, ',', '.');
}

function qty_fmt(float|int|string|null $n): string
{
    $n = (float)$n;
    return rtrim(rtrim(number_format($n, 2, ',', '.'), '0'), ',');
}

const BULAN_ID = [1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
                  'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function tgl_indo(?string $date): string
{
    if (!$date) {
        return '-';
    }
    $t = strtotime($date);
    return $t ? date('d', $t) . ' ' . BULAN_ID[(int)date('n', $t)] . ' ' . date('Y', $t) : '-';
}

function terbilang(int $n): string
{
    if ($n === 0) {
        return 'nol';
    }
    return trim((string)preg_replace('/\s+/', ' ', _terbilang(abs($n))));
}

function _terbilang(int $n): string
{
    static $s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    if ($n < 12) {
        return $s[$n];
    }
    if ($n < 20) {
        return $s[$n - 10] . ' belas';
    }
    if ($n < 100) {
        return $s[intdiv($n, 10)] . ' puluh ' . _terbilang($n % 10);
    }
    if ($n < 200) {
        return 'seratus ' . _terbilang($n - 100);
    }
    if ($n < 1000) {
        return $s[intdiv($n, 100)] . ' ratus ' . _terbilang($n % 100);
    }
    if ($n < 2000) {
        return 'seribu ' . _terbilang($n - 1000);
    }
    foreach ([1_000_000_000_000 => 'triliun', 1_000_000_000 => 'miliar', 1_000_000 => 'juta', 1_000 => 'ribu'] as $base => $name) {
        if ($n >= $base) {
            return _terbilang(intdiv($n, $base)) . " $name " . _terbilang($n % $base);
        }
    }
    return '';
}

function valid_date(?string $s): ?string
{
    if (!$s) {
        return null;
    }
    $d = DateTime::createFromFormat('Y-m-d', $s);
    return ($d && $d->format('Y-m-d') === $s) ? $s : null;
}

/* ---------- Session: flash, CSRF, auth ---------- */

function flash(string $type, string $msg): void
{
    $_SESSION['flash'][] = ['type' => $type, 'msg' => $msg];
}

function flash_pull(): array
{
    $f = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $f;
}

function csrf_token(): string
{
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">';
}

function require_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST'
        || !hash_equals(csrf_token(), (string)($_POST['_csrf'] ?? ''))) {
        abort(400, 'Permintaan tidak valid (token keamanan salah/kedaluwarsa). Muat ulang halaman lalu coba lagi.');
    }
}

function auth_enabled(): bool
{
    return env('APP_PASSWORD') !== null;
}

function require_login(): void
{
    if (auth_enabled() && empty($_SESSION['user'])) {
        redirect('login');
    }
}

/* ---------- View ---------- */

function render(string $view, array $vars = [], bool $layout = true): void
{
    extract($vars, EXTR_SKIP);
    ob_start();
    require __DIR__ . '/../views/' . $view . '.php';
    $content = ob_get_clean();
    if ($layout) {
        require __DIR__ . '/../views/layout.php';
    } else {
        echo $content;
    }
}
