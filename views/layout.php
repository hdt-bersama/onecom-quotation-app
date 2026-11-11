<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($pageTitle ?? 'Penawaran & Invoice') ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link href="assets/app.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-expand-md app-nav">
    <div class="container-xl">
        <a class="navbar-brand" href="<?= e(url('dashboard')) ?>"><i class="bi bi-receipt-cutoff"></i> Penawaran &amp; Invoice</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav"><span class="navbar-toggler-icon"></span></button>
        <div class="collapse navbar-collapse" id="nav">
            <ul class="navbar-nav me-auto">
                <li class="nav-item"><a class="nav-link" href="<?= e(url('dashboard')) ?>">Dashboard</a></li>
                <li class="nav-item"><a class="nav-link" href="<?= e(url('doc.new', ['type' => 'quotation'])) ?>">+ Penawaran</a></li>
                <li class="nav-item"><a class="nav-link" href="<?= e(url('doc.new', ['type' => 'invoice'])) ?>">+ Invoice</a></li>
                <li class="nav-item"><a class="nav-link" href="<?= e(url('settings')) ?>">Pengaturan</a></li>
            </ul>
            <?php if (auth_enabled() && !empty($_SESSION['user'])): ?>
                <form method="post" action="<?= e(url('logout')) ?>" class="d-flex">
                    <?= csrf_field() ?>
                    <button class="btn btn-sm btn-outline-light">Keluar</button>
                </form>
            <?php endif; ?>
        </div>
    </div>
</nav>

<main class="container-xl py-4">
    <?php foreach (flash_pull() as $f): ?>
        <div class="alert alert-<?= e($f['type']) ?> alert-dismissible fade show" role="alert">
            <?= e($f['msg']) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endforeach; ?>
    <?= $content ?>
</main>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/app.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js"></script>
</body>
</html>
