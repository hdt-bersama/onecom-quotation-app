<?php
/** @var array $doc @var string $type @var ?int $id @var array $numbers @var array $customers @var array $types */
$isNew = !$id;
$pageTitle = ($isNew ? 'Buat ' : 'Edit ') . $types[$type]['label'];

$items = $doc['items'] ?: [];
$init = [
    'type'       => $type,
    'isNew'      => $isNew,
    'number'     => $doc['number'],
    'numbers'    => $numbers,
    'taxPercent' => (float)$doc['tax_percent'],
    'customers'  => $customers,
    'items'      => array_map(fn($i) => [
        'description'      => $i['description'] ?? '',
        'details'          => $i['details'] ?? '',
        'qty'              => (float)($i['qty'] ?? 1),
        'unit'             => $i['unit'] ?? '',
        'unit_price'       => (float)($i['unit_price'] ?? 0),
        'discount_percent' => (float)($i['discount_percent'] ?? 0),
    ], $items),
    'customer'   => [
        'id' => $doc['customer_id'], 'name' => $doc['customer_name'],
        'address' => $doc['customer_address'] ?? '', 'phone' => $doc['customer_phone'] ?? '',
    ],
    'labels'     => ['quotation' => $types['quotation']['date2_label'], 'invoice' => $types['invoice']['date2_label']],
];
?>
<script type="application/json" id="doc-init"><?= json_encode($init, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) ?></script>

<form method="post" action="<?= e(url('doc.save')) ?>" x-data="docForm()" autocomplete="off">
    <?= csrf_field() ?>
    <input type="hidden" name="type" :value="type">
    <input type="hidden" name="id" value="<?= (int)$id ?>">
    <input type="hidden" name="customer_id" :value="customer.id || ''">

    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 class="h3 m-0"><?= $isNew ? 'Dokumen Baru' : 'Edit Ulang ' . e($types[$type]['label']) ?></h1>
        <?php if ($isNew): ?>
            <div class="btn-group" role="group">
                <button type="button" class="btn" :class="type==='quotation' ? 'btn-primary' : 'btn-outline-primary'" @click="setType('quotation')">Penawaran</button>
                <button type="button" class="btn" :class="type==='invoice' ? 'btn-primary' : 'btn-outline-primary'" @click="setType('invoice')">Invoice</button>
            </div>
        <?php endif; ?>
    </div>

    <div class="row g-3">
        <div class="col-lg-8">
            <div class="card mb-3"><div class="card-body">
                <h2 class="h6 text-uppercase text-muted mb-3">Pelanggan</h2>
                <div class="row g-3">
                    <div class="col-md-7">
                        <label class="form-label">Nama pelanggan / perusahaan *</label>
                        <input class="form-control" name="customer_name" x-model="customer.name" list="cust-list" @input="pickCustomer()" required>
                        <datalist id="cust-list"><?php foreach ($customers as $c): ?><option value="<?= e($c['name']) ?>"><?php endforeach; ?></datalist>
                    </div>
                    <div class="col-md-5">
                        <label class="form-label">Telepon</label>
                        <input class="form-control" name="customer_phone" x-model="customer.phone">
                    </div>
                    <div class="col-12">
                        <label class="form-label">Alamat</label>
                        <textarea class="form-control" rows="2" name="customer_address" x-model="customer.address"></textarea>
                    </div>
                    <div class="col-12">
                        <label class="form-label">Perihal</label>
                        <input class="form-control" name="subject" value="<?= e($doc['subject']) ?>" placeholder="mis. Penawaran Harga Laptop">
                    </div>
                </div>
            </div></div>

            <div class="card mb-3"><div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="h6 text-uppercase text-muted m-0">Item Produk / Jasa</h2>
                    <button type="button" class="btn btn-sm btn-outline-primary" @click="add()"><i class="bi bi-plus-lg"></i> Tambah baris</button>
                </div>
                <div class="table-responsive">
                <table class="table items-table align-middle">
                    <thead><tr>
                        <th style="min-width:260px">Deskripsi &amp; spesifikasi</th>
                        <th style="width:80px">Qty</th><th style="width:80px">Satuan</th>
                        <th style="width:140px">Harga satuan</th><th style="width:90px">Diskon %</th>
                        <th class="text-end" style="width:140px">Total</th><th style="width:44px"></th>
                    </tr></thead>
                    <tbody>
                    <template x-for="(it, i) in items" :key="i">
                        <tr>
                            <td>
                                <input class="form-control form-control-sm mb-1" :name="`items[${i}][description]`" x-model="it.description" placeholder="Nama barang / jasa">
                                <textarea class="form-control form-control-sm" rows="2" :name="`items[${i}][details]`" x-model="it.details" placeholder="Spesifikasi (satu baris per spek, opsional)"></textarea>
                            </td>
                            <td><input type="number" min="0" step="any" class="form-control form-control-sm" :name="`items[${i}][qty]`" x-model.number="it.qty"></td>
                            <td><input class="form-control form-control-sm" :name="`items[${i}][unit]`" x-model="it.unit" placeholder="unit"></td>
                            <td><input type="number" min="0" step="any" class="form-control form-control-sm" :name="`items[${i}][unit_price]`" x-model.number="it.unit_price"></td>
                            <td><input type="number" min="0" max="100" step="any" class="form-control form-control-sm" :name="`items[${i}][discount_percent]`" x-model.number="it.discount_percent"></td>
                            <td class="text-end fw-semibold" x-text="fmt(lineTotal(it))"></td>
                            <td><button type="button" class="btn btn-sm btn-outline-danger" @click="remove(i)" title="Hapus baris"><i class="bi bi-x-lg"></i></button></td>
                        </tr>
                    </template>
                    </tbody>
                </table>
                </div>
            </div></div>

            <div class="card"><div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Catatan</label>
                    <textarea class="form-control" rows="2" name="notes" placeholder="mis. Barang ready, harga dapat berubah sewaktu-waktu"><?= e($doc['notes']) ?></textarea>
                </div>
                <div>
                    <label class="form-label">Syarat &amp; Ketentuan <span class="text-muted small">(satu poin per baris)</span></label>
                    <textarea class="form-control" rows="4" name="terms"><?= e($doc['terms']) ?></textarea>
                </div>
            </div></div>
        </div>

        <div class="col-lg-4">
            <div class="card mb-3"><div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Nomor dokumen</label>
                    <input class="form-control" name="number" x-model="number" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Tanggal</label>
                    <input type="date" class="form-control" name="issue_date" value="<?= e($doc['issue_date']) ?>" required>
                </div>
                <div class="mb-3">
                    <label class="form-label" x-text="labels[type]"></label>
                    <input type="date" class="form-control" name="date2" value="<?= e($doc['date2']) ?>">
                </div>
                <div class="mb-0">
                    <label class="form-label">Status</label>
                    <?php foreach ($types as $t => $cfg): ?>
                        <select class="form-select" name="status" x-show="type==='<?= $t ?>'" :disabled="type!=='<?= $t ?>'">
                            <?php foreach ($cfg['statuses'] as $k => $lbl): ?>
                                <option value="<?= e($k) ?>" <?= ($doc['type'] ?? $type) === $t && $doc['status'] === $k ? 'selected' : '' ?>><?= e($lbl) ?></option>
                            <?php endforeach; ?>
                        </select>
                    <?php endforeach; ?>
                </div>
            </div></div>

            <div class="card mb-3 totals-card"><div class="card-body">
                <div class="d-flex justify-content-between"><span>Subtotal</span><span x-text="fmt(subtotal)"></span></div>
                <div class="d-flex justify-content-between text-danger"><span>Diskon</span><span x-text="'- ' + fmt(discountTotal)"></span></div>
                <div class="d-flex justify-content-between align-items-center my-2">
                    <span>PPN (%)</span>
                    <input type="number" min="0" max="100" step="any" name="tax_percent" class="form-control form-control-sm text-end" style="width:80px" x-model.number="taxPercent">
                </div>
                <div class="d-flex justify-content-between"><span>Nilai PPN</span><span x-text="fmt(taxAmount)"></span></div>
                <hr>
                <div class="d-flex justify-content-between fs-5 fw-bold"><span>Total</span><span>Rp <span x-text="fmt(total)"></span></span></div>
            </div></div>

            <div class="d-grid gap-2">
                <button class="btn btn-primary btn-lg" name="after" value="list">
                    <i class="bi bi-save"></i>
                    <?php if ($isNew): ?>
                        <span x-text="type==='invoice' ? 'Simpan sebagai Invoice' : 'Simpan sebagai Penawaran'"></span>
                    <?php else: ?>Simpan Perubahan<?php endif; ?>
                </button>
                <button class="btn btn-outline-primary" name="after" value="print"><i class="bi bi-printer"></i> Simpan &amp; Cetak</button>
                <a class="btn btn-link" href="<?= e(url('dashboard')) ?>">Batal</a>
            </div>
        </div>
    </div>
</form>
