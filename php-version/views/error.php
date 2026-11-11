<div class="text-center py-5">
    <h1 class="display-4 text-muted"><?= (int)$code ?></h1>
    <p class="lead"><?= e($title) ?></p>
    <?php if ($msg): ?><p class="text-muted"><?= e($msg) ?></p><?php endif; ?>
    <a href="<?= e(url('dashboard')) ?>" class="btn btn-primary">Kembali ke Dashboard</a>
</div>
