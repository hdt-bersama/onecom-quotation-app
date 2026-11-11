<?php
/** @var array $doc @var string $type @var array $cfg @var array $settings @var bool $showDiscount @var bool $autoprint */
$isInv   = $type === 'invoice';
$terms   = array_values(array_filter(array_map('trim', preg_split('/\R/', (string)$doc['terms']) ?: [])));
$hasBank = $settings['bank_name'] || $settings['bank_account_no'] || $settings['bank_account_holder'];
$signer  = $settings['signer_name'] ?: $settings['company_name'];
$total   = (float)$doc['total'];
?><!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($cfg['label'] . ' ' . str_replace('/', '-', $doc['number'])) ?></title>
    <link rel="stylesheet" href="assets/print.css">
</head>
<body>
<div class="toolbar no-print">
    <a href="<?= e(url('dashboard')) ?>">&larr; Dashboard</a>
    <a href="<?= e(url('doc.edit', ['type' => $type, 'id' => $doc['id']])) ?>">Edit</a>
    <button onclick="window.print()">Cetak / Simpan PDF</button>
    <span class="hint">Di dialog cetak pilih A4, margin Default, dan matikan "Header and footer".</span>
</div>

<div class="sheet">
    <header class="kop">
        <?php if ($settings['logo_path']): ?><img class="logo" src="<?= e($settings['logo_path']) ?>" alt=""><?php endif; ?>
        <div class="kop-text">
            <div class="company"><?= e($settings['company_name']) ?></div>
            <?php if ($settings['address']): ?><div><?= nl2br(e($settings['address'])) ?></div><?php endif; ?>
            <?php if ($settings['phone'] || $settings['email']): ?>
                <div><?= e(implode('  |  ', array_filter([$settings['phone'] ? 'Telp. ' . $settings['phone'] : '', $settings['email']]))) ?></div>
            <?php endif; ?>
        </div>
    </header>

    <h1 class="doc-title"><?= e($cfg['title']) ?></h1>

    <section class="info">
        <div class="to">
            <div class="lbl">Kepada Yth.</div>
            <div class="to-name"><?= e($doc['customer_name']) ?></div>
            <?php if ($doc['customer_address']): ?><div><?= nl2br(e($doc['customer_address'])) ?></div><?php endif; ?>
            <?php if ($doc['customer_phone']): ?><div>Telp. <?= e($doc['customer_phone']) ?></div><?php endif; ?>
        </div>
        <table class="meta">
            <tr><td>Nomor</td><td>:</td><td><b><?= e($doc['number']) ?></b></td></tr>
            <tr><td>Tanggal</td><td>:</td><td><?= e(tgl_indo($doc['issue_date'])) ?></td></tr>
            <?php if ($doc['date2']): ?><tr><td><?= e($cfg['date2_label']) ?></td><td>:</td><td><?= e(tgl_indo($doc['date2'])) ?></td></tr><?php endif; ?>
            <?php if ($isInv && $doc['status'] === 'paid'): ?><tr><td>Status</td><td>:</td><td><b>LUNAS</b></td></tr><?php endif; ?>
        </table>
    </section>

    <?php if ($doc['subject']): ?><p class="subject"><b>Perihal :</b> <?= e($doc['subject']) ?></p><?php endif; ?>
    <p class="intro">
        Dengan hormat,<br>
        <?= $isInv ? 'Berikut kami sampaikan rincian tagihan atas pesanan Anda:' : 'Berikut kami sampaikan penawaran harga dengan rincian sebagai berikut:' ?>
    </p>

    <table class="items">
        <thead>
            <tr>
                <th class="c" style="width:7%">No</th>
                <th>Deskripsi</th>
                <th class="c" style="width:11%">Qty</th>
                <th class="r" style="width:16%">Harga (Rp)</th>
                <?php if ($showDiscount): ?><th class="c" style="width:9%">Disc</th><?php endif; ?>
                <th class="r" style="width:17%">Total (Rp)</th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($doc['items'] as $n => $it): ?>
            <tr>
                <td class="c"><?= $n + 1 ?></td>
                <td>
                    <div class="it-name"><?= e($it['description']) ?></div>
                    <?php if ($it['details']): ?><div class="it-spec"><?= nl2br(e($it['details'])) ?></div><?php endif; ?>
                </td>
                <td class="c"><?= e(qty_fmt($it['qty'])) ?><?= $it['unit'] ? ' ' . e($it['unit']) : '' ?></td>
                <td class="r"><?= rupiah($it['unit_price']) ?></td>
                <?php if ($showDiscount): ?><td class="c"><?= (float)$it['discount_percent'] > 0 ? e(qty_fmt($it['discount_percent'])) . '%' : '-' ?></td><?php endif; ?>
                <td class="r"><?= rupiah($it['line_total']) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>

    <div class="summary">
        <div class="terbilang">
            <div class="lbl">Terbilang</div>
            <em><?= e(ucfirst(terbilang((int)round($total)))) ?> rupiah</em>
        </div>
        <table class="totals">
            <?php if ((float)$doc['discount_total'] > 0 || (float)$doc['tax_amount'] > 0): ?>
                <tr><td>Subtotal</td><td class="r"><?= rupiah($doc['subtotal']) ?></td></tr>
            <?php endif; ?>
            <?php if ((float)$doc['discount_total'] > 0): ?>
                <tr><td>Diskon</td><td class="r">- <?= rupiah($doc['discount_total']) ?></td></tr>
            <?php endif; ?>
            <?php if ((float)$doc['tax_amount'] > 0): ?>
                <tr><td>PPN <?= e(qty_fmt($doc['tax_percent'])) ?>%</td><td class="r"><?= rupiah($doc['tax_amount']) ?></td></tr>
            <?php endif; ?>
            <tr class="grand"><td>TOTAL</td><td class="r">Rp <?= rupiah($total) ?></td></tr>
        </table>
    </div>

    <div class="closing">
        <?php if ($doc['notes']): ?>
            <div class="block"><div class="lbl">Catatan</div><div><?= nl2br(e($doc['notes'])) ?></div></div>
        <?php endif; ?>

        <div class="two">
            <?php if ($hasBank): ?>
            <div class="block">
                <div class="lbl">Pembayaran via transfer</div>
                <div><?= e($settings['bank_name']) ?></div>
                <div class="rek"><?= e($settings['bank_account_no']) ?></div>
                <div>a.n. <?= e($settings['bank_account_holder']) ?></div>
            </div>
            <?php endif; ?>
            <?php if ($terms): ?>
            <div class="block">
                <div class="lbl">Syarat &amp; Ketentuan</div>
                <ol class="terms"><?php foreach ($terms as $t): ?><li><?= e($t) ?></li><?php endforeach; ?></ol>
            </div>
            <?php endif; ?>
        </div>

        <p class="thanks">Demikian <?= $isInv ? 'invoice' : 'surat penawaran' ?> ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>

        <div class="sign">
            <div class="sign-box">
                <div><?= $isInv ? 'Diterima oleh,' : 'Disetujui oleh,' ?></div>
                <div class="sign-space"></div>
                <div class="sign-name">( <?= e($doc['customer_name']) ?> )</div>
            </div>
            <div class="sign-box">
                <div><?= e($settings['city']) ?>, <?= e(tgl_indo($doc['issue_date'])) ?><br>Hormat kami,</div>
                <div class="sign-space"></div>
                <div class="sign-name">( <?= e($signer) ?> )</div>
            </div>
        </div>
    </div>
</div>
<?php if ($autoprint): ?><script>window.addEventListener('load', () => window.print());</script><?php endif; ?>
</body>
</html>
