<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Masuk</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/app.css" rel="stylesheet">
</head>
<body class="login-body">
<div class="login-card card shadow-sm">
    <div class="card-body p-4">
        <h1 class="h4 mb-1">Penawaran &amp; Invoice</h1>
        <p class="text-muted small mb-4">Masuk untuk melanjutkan</p>
        <?php foreach (flash_pull() as $f): ?>
            <div class="alert alert-<?= e($f['type']) ?> py-2"><?= e($f['msg']) ?></div>
        <?php endforeach; ?>
        <form method="post" action="<?= e(url('login')) ?>">
            <?= csrf_field() ?>
            <div class="mb-3">
                <label class="form-label">Username</label>
                <input name="username" class="form-control" autocomplete="username" autofocus required>
            </div>
            <div class="mb-3">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-control" autocomplete="current-password" required>
            </div>
            <button class="btn btn-primary w-100">Masuk</button>
        </form>
    </div>
</div>
</body>
</html>
