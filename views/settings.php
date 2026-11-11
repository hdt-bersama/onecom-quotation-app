<?php /** @var array $s */ $pageTitle = 'Pengaturan'; ?>
<h1 class="h3 mb-4">Pengaturan Perusahaan</h1>
<form method="post" action="<?= e(url('settings.save')) ?>" enctype="multipart/form-data">
    <?= csrf_field() ?>
    <div class="row g-3">
        <div class="col-lg-7">
            <div class="card mb-3"><div class="card-body">
                <h2 class="h6 text-uppercase text-muted mb-3">Kop Surat</h2>
                <div class="mb-3"><label class="form-label">Nama perusahaan / toko</label>
                    <input class="form-control" name="company_name" value="<?= e($s['company_name']) ?>" required></div>
                <div class="mb-3"><label class="form-label">Alamat</label>
                    <textarea class="form-control" rows="2" name="address"><?= e($s['address']) ?></textarea></div>
                <div class="row g-3">
                    <div class="col-md-6"><label class="form-label">Nomor telepon</label><input class="form-control" name="phone" value="<?= e($s['phone']) ?>"></div>
                    <div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" name="email" value="<?= e($s['email']) ?>"></div>
                    <div class="col-md-6"><label class="form-label">Kota (untuk "Jakarta, 06 November 2026")</label><input class="form-control" name="city" value="<?= e($s['city']) ?>"></div>
                    <div class="col-md-6"><label class="form-label">Nama penandatangan</label><input class="form-control" name="signer_name" value="<?= e($s['signer_name']) ?>"></div>
                </div>
                <hr>
                <label class="form-label">Logo (PNG / JPG / WebP, maks 2 MB)</label>
                <?php if ($s['logo_path']): ?>
                    <div class="mb-2 d-flex align-items-center gap-3">
                        <img src="<?= e($s['logo_path']) ?>" alt="Logo" style="max-height:70px;max-width:200px">
                        <div class="form-check"><input class="form-check-input" type="checkbox" name="remove_logo" value="1" id="rm"><label class="form-check-label" for="rm">Hapus logo</label></div>
                    </div>
                <?php endif; ?>
                <input type="file" class="form-control" name="logo" accept="image/png,image/jpeg,image/webp">
            </div></div>

            <div class="card"><div class="card-body">
                <h2 class="h6 text-uppercase text-muted mb-3">Syarat &amp; Ketentuan Standar</h2>
                <textarea class="form-control" rows="5" name="terms"><?= e($s['terms']) ?></textarea>
                <div class="form-text">Satu poin per baris. Menjadi isi awal pada dokumen baru dan masih bisa diubah per dokumen.</div>
            </div></div>
        </div>

        <div class="col-lg-5">
            <div class="card mb-3"><div class="card-body">
                <h2 class="h6 text-uppercase text-muted mb-3">Rekening Bank Transfer</h2>
                <div class="mb-3"><label class="form-label">Nama bank</label><input class="form-control" name="bank_name" value="<?= e($s['bank_name']) ?>"></div>
                <div class="mb-3"><label class="form-label">Nomor rekening</label><input class="form-control" name="bank_account_no" value="<?= e($s['bank_account_no']) ?>"></div>
                <div class="mb-0"><label class="form-label">Atas nama</label><input class="form-control" name="bank_account_holder" value="<?= e($s['bank_account_holder']) ?>"></div>
            </div></div>
            <div class="card mb-3"><div class="card-body">
                <h2 class="h6 text-uppercase text-muted mb-3">Penomoran &amp; Default</h2>
                <div class="row g-3">
                    <div class="col-6"><label class="form-label">Prefix penawaran</label><input class="form-control" name="quotation_prefix" value="<?= e($s['quotation_prefix']) ?>"></div>
                    <div class="col-6"><label class="form-label">Prefix invoice</label><input class="form-control" name="invoice_prefix" value="<?= e($s['invoice_prefix']) ?>"></div>
                    <div class="col-6"><label class="form-label">PPN default (%)</label><input type="number" step="any" min="0" max="100" class="form-control" name="default_tax_percent" value="<?= e($s['default_tax_percent']) ?>"></div>
                    <div class="col-6"><label class="form-label">Masa berlaku / jatuh tempo (hari)</label><input type="number" min="0" class="form-control" name="default_valid_days" value="<?= e($s['default_valid_days']) ?>"></div>
                </div>
            </div></div>
            <button class="btn btn-primary btn-lg w-100"><i class="bi bi-save"></i> Simpan Pengaturan</button>
        </div>
    </div>
</form>
