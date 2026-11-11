<?php
/** @var array $rows @var array $stats @var string $q @var string $tab @var string $status */
$pageTitle = 'Dashboard';
$T = Documents::TYPES;

$qCount   = array_sum(array_column($stats['quotation'], 'count'));
$qPending = $stats['quotation']['pending']['count'] ?? 0;
$qApprov  = $stats['quotation']['approved']['sum'] ?? 0;
$unpaid   = ($stats['invoice']['draft']['sum'] ?? 0) + ($stats['invoice']['sent']['sum'] ?? 0);
$unpaidN  = ($stats['invoice']['draft']['count'] ?? 0) + ($stats['invoice']['sent']['count'] ?? 0);
$paid     = $stats['invoice']['paid']['sum'] ?? 0;
$badge = ['pending' => 'warning', 'approved' => 'success', 'rejected' => 'danger',
          'draft' => 'secondary', 'sent' => 'info', 'paid' => 'success'];
?>
<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
    <h1 class="h3 m-0">Dokumen</h1>
    <div class="d-flex gap-2">
        <a class="btn btn-primary" href="<?= e(url('doc.new', ['type' => 'quotation'])) ?>"><i class="bi bi-plus-lg"></i> Penawaran Baru</a>
        <a class="btn btn-outline-primary" href="<?= e(url('doc.new', ['type' => 'invoice'])) ?>"><i class="bi bi-plus-lg"></i> Invoice Baru</a>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-6 col-lg-3"><div class="stat"><div class="stat-label">Total Penawaran</div><div class="stat-value"><?= (int)$qCount ?></div><div class="stat-sub"><?= (int)$qPending ?> menunggu</div></div></div>
    <div class="col-6 col-lg-3"><div class="stat"><div class="stat-label">Penawaran Disetujui</div><div class="stat-value">Rp <?= rupiah($qApprov) ?></div></div></div>
    <div class="col-6 col-lg-3"><div class="stat"><div class="stat-label">Invoice Belum Lunas</div><div class="stat-value">Rp <?= rupiah($unpaid) ?></div><div class="stat-sub"><?= (int)$unpaidN ?> invoice</div></div></div>
    <div class="col-6 col-lg-3"><div class="stat"><div class="stat-label">Invoice Lunas</div><div class="stat-value">Rp <?= rupiah($paid) ?></div></div></div>
</div>

<form class="row g-2 mb-3" method="get" action="index.php">
    <input type="hidden" name="r" value="dashboard">
    <div class="col-12 col-md-5"><input class="form-control" name="q" value="<?= e($q) ?>" placeholder="Cari nomor / pelanggan / perihal..."></div>
    <div class="col-6 col-md-3">
        <select class="form-select" name="tab">
            <option value="all"       <?= $tab === 'all' ? 'selected' : '' ?>>Semua jenis</option>
            <option value="quotation" <?= $tab === 'quotation' ? 'selected' : '' ?>>Penawaran</option>
            <option value="invoice"   <?= $tab === 'invoice' ? 'selected' : '' ?>>Invoice</option>
        </select>
    </div>
    <div class="col-6 col-md-2">
        <select class="form-select" name="status">
            <option value="">Semua status</option>
            <?php foreach ($T as $t): foreach ($t['statuses'] as $k => $lbl): ?>
                <option value="<?= e($k) ?>" <?= $status === $k ? 'selected' : '' ?>><?= e($t['label'] . ' · ' . $lbl) ?></option>
            <?php endforeach; endforeach; ?>
        </select>
    </div>
    <div class="col-12 col-md-2 d-grid"><button class="btn btn-secondary">Filter</button></div>
</form>

<div class="card">
    <div class="table-responsive">
        <table class="table table-hover align-middle m-0">
            <thead>
                <tr><th>Jenis</th><th>Nomor</th><th>Tanggal</th><th>Pelanggan</th><th class="text-end">Total (Rp)</th><th>Status</th><th class="text-end">Aksi</th></tr>
            </thead>
            <tbody>
            <?php if (!$rows): ?>
                <tr><td colspan="7" class="text-center text-muted py-5">Belum ada dokumen. Buat penawaran atau invoice pertama Anda.</td></tr>
            <?php endif; ?>
            <?php foreach ($rows as $r): $cfg = $T[$r['type']]; ?>
                <tr>
                    <td><span class="badge text-bg-<?= $r['type'] === 'invoice' ? 'dark' : 'primary' ?>"><?= e($cfg['label']) ?></span></td>
                    <td class="fw-semibold text-nowrap"><?= e($r['number']) ?></td>
                    <td class="text-nowrap"><?= e(tgl_indo($r['issue_date'])) ?></td>
                    <td><?= e($r['customer_name']) ?><?php if ($r['subject']): ?><div class="small text-muted"><?= e($r['subject']) ?></div><?php endif; ?></td>
                    <td class="text-end text-nowrap"><?= rupiah($r['total']) ?></td>
                    <td>
                        <form method="post" action="<?= e(url('doc.status')) ?>">
                            <?= csrf_field() ?>
                            <input type="hidden" name="type" value="<?= e($r['type']) ?>">
                            <input type="hidden" name="id" value="<?= (int)$r['id'] ?>">
                            <input type="hidden" name="tab" value="<?= e($tab) ?>">
                            <input type="hidden" name="q" value="<?= e($q) ?>">
                            <input type="hidden" name="filter_status" value="<?= e($status) ?>">
                            <select name="status" class="form-select form-select-sm status-select text-bg-<?= $badge[$r['status']] ?? 'secondary' ?>" onchange="this.form.submit()">
                                <?php foreach ($cfg['statuses'] as $k => $lbl): ?>
                                    <option value="<?= e($k) ?>" <?= $r['status'] === $k ? 'selected' : '' ?>><?= e($lbl) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </form>
                    </td>
                    <td class="text-end text-nowrap">
                        <a class="btn btn-sm btn-outline-secondary" title="Cetak / PDF" target="_blank" rel="noopener"
                           href="<?= e(url('doc.print', ['type' => $r['type'], 'id' => $r['id']])) ?>"><i class="bi bi-printer"></i></a>
                        <a class="btn btn-sm btn-outline-primary" title="Edit ulang"
                           href="<?= e(url('doc.edit', ['type' => $r['type'], 'id' => $r['id']])) ?>"><i class="bi bi-pencil-square"></i></a>
                        <?php if ($r['type'] === 'quotation'): ?>
                            <form method="post" action="<?= e(url('doc.convert')) ?>" class="d-inline" onsubmit="return confirm('Buat invoice dari penawaran ini?')">
                                <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>">
                                <button class="btn btn-sm btn-outline-success" title="Jadikan Invoice"><i class="bi bi-arrow-right-square"></i></button>
                            </form>
                        <?php endif; ?>
                        <form method="post" action="<?= e(url('doc.delete')) ?>" class="d-inline"
                              onsubmit="return confirm('Hapus <?= e($cfg['label']) ?> <?= e($r['number']) ?>? Tindakan ini tidak dapat dibatalkan.')">
                            <?= csrf_field() ?>
                            <input type="hidden" name="type" value="<?= e($r['type']) ?>">
                            <input type="hidden" name="id" value="<?= (int)$r['id'] ?>">
                            <button class="btn btn-sm btn-outline-danger" title="Hapus"><i class="bi bi-trash"></i></button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
