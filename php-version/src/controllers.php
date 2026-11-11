<?php
declare(strict_types=1);

/* =====================================================================
 *  Controller: setiap fungsi = satu halaman / aksi.
 *  Pemetaan route -> fungsi ada di public/index.php
 * ===================================================================== */

/* ---------- Auth ---------- */

function page_login(): void
{
    if (!auth_enabled() || !empty($_SESSION['user'])) {
        redirect('dashboard');
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        require_post();
        $okUser = hash_equals((string)cfg('app.user'), (string)($_POST['username'] ?? ''));
        $okPass = hash_equals((string)cfg('app.password'), (string)($_POST['password'] ?? ''));
        if ($okUser && $okPass) {
            session_regenerate_id(true);
            $_SESSION['user'] = (string)cfg('app.user');
            redirect('dashboard');
        }
        usleep(400000); // perlambat tebak-tebakan password
        flash('danger', 'Username atau password salah.');
    }
    render('login', [], false);
}

function action_logout(): void
{
    require_post();
    $_SESSION = [];
    session_destroy();
    header('Location: ' . url('login'));
    exit;
}

/* ---------- Dashboard ---------- */

function page_dashboard(): void
{
    $q      = trim((string)($_GET['q'] ?? ''));
    $tab    = (string)($_GET['tab'] ?? 'all');
    $status = (string)($_GET['status'] ?? '');

    $rows = [];
    $stats = [];
    foreach (array_keys(Documents::TYPES) as $t) {
        $repo = new Documents($t);
        $stats[$t] = $repo->summary();
        if ($tab !== 'all' && $tab !== $t) {
            continue;
        }
        foreach ($repo->all($q, $status) as $r) {
            $r['type'] = $t;
            $rows[] = $r;
        }
    }
    usort($rows, fn($a, $b) => [$b['issue_date'], $b['id']] <=> [$a['issue_date'], $a['id']]);

    render('dashboard', compact('rows', 'stats', 'q', 'tab', 'status'));
}

/* ---------- Form dokumen (baru / edit ulang) ---------- */

function page_doc_form(): void
{
    $type = $_GET['type'] ?? 'quotation';
    if (!Documents::isType($type)) {
        abort(404);
    }
    $id       = (int)($_GET['id'] ?? 0) ?: null;
    $repo     = new Documents($type);
    $settings = Settings::get();

    $numbers = [];
    $today   = date('Y-m-d');
    foreach (array_keys(Documents::TYPES) as $t) {
        $numbers[$t] = (new Documents($t))->nextNumber($today, $settings[Documents::TYPES[$t]['prefix_key']] ?: strtoupper($t));
    }

    if ($id) {
        $doc = $repo->find($id) ?? abort(404);
    } else {
        $days = (int)$settings['default_valid_days'];
        $doc = [
            'type' => $type, 'number' => $numbers[$type],
            'customer_id' => null, 'customer_name' => '', 'customer_address' => '', 'customer_phone' => '',
            'subject' => '', 'issue_date' => $today,
            'date2' => date('Y-m-d', strtotime("+$days days")),
            'status' => Documents::TYPES[$type]['default'],
            'tax_percent' => $settings['default_tax_percent'],
            'notes' => '', 'terms' => $settings['terms'] ?? '',
            'items' => [],
        ];
    }

    // Data yang gagal disimpan (mis. nomor ganda) dikembalikan ke form
    $old = $_SESSION['old'] ?? null;
    unset($_SESSION['old']);
    if ($old && $old['type'] === $type && $old['id'] === $id) {
        $doc = array_merge($doc, $old['doc']);
    }

    render('form', [
        'doc' => $doc, 'type' => $type, 'id' => $id, 'numbers' => $numbers,
        'customers' => Customers::all(), 'types' => Documents::TYPES, 'settings' => $settings,
    ]);
}

function doc_from_post(string $type): array
{
    $p   = $_POST;
    $cfg = Documents::TYPES[$type];

    $status = (string)($p['status'] ?? '');
    if (!isset($cfg['statuses'][$status])) {
        $status = $cfg['default'];
    }

    $items = [];
    foreach ((array)($p['items'] ?? []) as $it) {
        if (is_array($it)) {
            $items[] = $it;
        }
    }

    return [
        'type'             => $type,
        'number'           => trim((string)($p['number'] ?? '')),
        'customer_id'      => (int)($p['customer_id'] ?? 0) ?: null,
        'customer_name'    => trim((string)($p['customer_name'] ?? '')),
        'customer_address' => trim((string)($p['customer_address'] ?? '')) ?: null,
        'customer_phone'   => trim((string)($p['customer_phone'] ?? '')) ?: null,
        'subject'          => trim((string)($p['subject'] ?? '')) ?: null,
        'issue_date'       => valid_date($p['issue_date'] ?? null) ?? date('Y-m-d'),
        'date2'            => valid_date($p['date2'] ?? null),
        'status'           => $status,
        'tax_percent'      => min(100, max(0, (float)($p['tax_percent'] ?? 0))),
        'notes'            => trim((string)($p['notes'] ?? '')) ?: null,
        'terms'            => trim((string)($p['terms'] ?? '')) ?: null,
        'items'            => $items,
    ];
}

function action_doc_save(): void
{
    require_post();
    $type = $_POST['type'] ?? '';
    if (!Documents::isType($type)) {
        abort(400);
    }
    $id   = (int)($_POST['id'] ?? 0) ?: null;
    $repo = new Documents($type);
    if ($id && !$repo->find($id)) {
        abort(404);
    }

    $doc = doc_from_post($type);
    $errors = [];
    if ($doc['customer_name'] === '') {
        $errors[] = 'Nama pelanggan wajib diisi.';
    }
    [$clean] = Documents::calculate($doc['items'], (float)$doc['tax_percent']);
    if (!$clean) {
        $errors[] = 'Minimal harus ada satu baris item dengan deskripsi.';
    }

    if (!$errors) {
        try {
            $settings = Settings::get();
            $doc['customer_id'] = Customers::sync(
                $doc['customer_id'], $doc['customer_name'], $doc['customer_address'], $doc['customer_phone']
            );
            if ($doc['number'] === '') {
                $doc['number'] = $repo->nextNumber($doc['issue_date'], $settings[Documents::TYPES[$type]['prefix_key']] ?: strtoupper($type));
            }
            $newId = $repo->save($id, $doc);
            flash('success', Documents::TYPES[$type]['label'] . ' ' . $doc['number'] . ' berhasil disimpan.');

            if (($_POST['after'] ?? '') === 'print') {
                redirect('doc.print', ['type' => $type, 'id' => $newId]);
            }
            redirect('dashboard');
        } catch (PDOException $e) {
            if ($e->getCode() !== '23505') {   // unique_violation
                throw $e;
            }
            $errors[] = 'Nomor dokumen "' . $doc['number'] . '" sudah dipakai. Gunakan nomor lain.';
        }
    }

    $_SESSION['old'] = ['type' => $type, 'id' => $id, 'doc' => $doc];
    flash('danger', implode(' ', $errors));
    redirect($id ? 'doc.edit' : 'doc.new', array_filter(['type' => $type, 'id' => $id]));
}

function action_doc_delete(): void
{
    require_post();
    $type = $_POST['type'] ?? '';
    if (!Documents::isType($type)) {
        abort(400);
    }
    (new Documents($type))->delete((int)($_POST['id'] ?? 0));
    flash('success', 'Dokumen dihapus.');
    redirect('dashboard');
}

function action_doc_status(): void
{
    require_post();
    $type = $_POST['type'] ?? '';
    if (!Documents::isType($type)) {
        abort(400);
    }
    try {
        (new Documents($type))->setStatus((int)($_POST['id'] ?? 0), (string)($_POST['status'] ?? ''));
        flash('success', 'Status diperbarui.');
    } catch (InvalidArgumentException) {
        flash('danger', 'Status tidak valid.');
    }
    redirect('dashboard', array_filter([
        'tab' => $_POST['tab'] ?? null, 'q' => $_POST['q'] ?? null, 'status' => $_POST['filter_status'] ?? null,
    ]));
}

function action_doc_convert(): void
{
    require_post();
    $newId = Documents::quotationToInvoice((int)($_POST['id'] ?? 0), Settings::get());
    if (!$newId) {
        abort(404);
    }
    flash('success', 'Invoice (Draft) dibuat dari penawaran. Silakan periksa lalu ubah statusnya.');
    redirect('doc.edit', ['type' => 'invoice', 'id' => $newId]);
}

/* ---------- Cetak ---------- */

function page_doc_print(): void
{
    $type = $_GET['type'] ?? '';
    if (!Documents::isType($type)) {
        abort(404);
    }
    $doc = (new Documents($type))->find((int)($_GET['id'] ?? 0)) ?? abort(404);

    $showDiscount = false;
    foreach ($doc['items'] as $it) {
        if ((float)$it['discount_percent'] > 0) {
            $showDiscount = true;
            break;
        }
    }

    render('print', [
        'doc' => $doc, 'type' => $type, 'cfg' => Documents::TYPES[$type],
        'settings' => Settings::get(), 'showDiscount' => $showDiscount,
        'autoprint' => ($_GET['autoprint'] ?? '') === '1',
    ], false);
}

/* ---------- Pengaturan ---------- */

function page_settings(): void
{
    render('settings', ['s' => Settings::get()]);
}

function action_settings_save(): void
{
    require_post();
    $old = Settings::get();
    $p = $_POST;
    $text = fn(string $k) => trim((string)($p[$k] ?? '')) ?: null;

    $data = [
        'company_name'        => trim((string)($p['company_name'] ?? '')) ?: 'Nama Perusahaan Anda',
        'address'             => $text('address'),
        'phone'               => $text('phone'),
        'email'               => $text('email'),
        'city'                => trim((string)($p['city'] ?? '')) ?: 'Jakarta',
        'bank_name'           => $text('bank_name'),
        'bank_account_no'     => $text('bank_account_no'),
        'bank_account_holder' => $text('bank_account_holder'),
        'signer_name'         => $text('signer_name'),
        'terms'               => $text('terms'),
        'quotation_prefix'    => preg_replace('/[^A-Za-z0-9\-]/', '', (string)($p['quotation_prefix'] ?? '')) ?: 'QT',
        'invoice_prefix'      => preg_replace('/[^A-Za-z0-9\-]/', '', (string)($p['invoice_prefix'] ?? '')) ?: 'INV',
        'default_tax_percent' => min(100, max(0, (float)($p['default_tax_percent'] ?? 0))),
        'default_valid_days'  => max(0, (int)($p['default_valid_days'] ?? 14)),
        'logo_path'           => $old['logo_path'],
    ];

    $dir = cfg('upload.dir');
    $deleteOld = false;

    if (!empty($p['remove_logo'])) {
        $data['logo_path'] = null;
        $deleteOld = true;
    }

    $f = $_FILES['logo'] ?? null;
    if ($f && $f['error'] === UPLOAD_ERR_OK) {
        $allowed = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
        if ($f['size'] > cfg('upload.max_bytes')) {
            flash('danger', 'Ukuran logo maksimal 2 MB.');
        } elseif (!isset($allowed[$mime]) || @getimagesize($f['tmp_name']) === false) {
            flash('danger', 'Logo harus berupa gambar PNG, JPG, atau WebP.');
        } else {
            $name = 'logo_' . bin2hex(random_bytes(6)) . '.' . $allowed[$mime];
            if (!is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }
            if (move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) {
                $data['logo_path'] = cfg('upload.url') . '/' . $name;
                $deleteOld = true;
            } else {
                flash('danger', 'Gagal menyimpan logo. Pastikan folder public/uploads dapat ditulis.');
            }
        }
    } elseif ($f && $f['error'] !== UPLOAD_ERR_NO_FILE) {
        flash('danger', 'Upload logo gagal (kode ' . (int)$f['error'] . ').');
    }

    Settings::save($data);

    if ($deleteOld && $old['logo_path'] && $old['logo_path'] !== $data['logo_path']) {
        $file = $dir . '/' . basename((string)$old['logo_path']);
        if (is_file($file)) {
            @unlink($file);
        }
    }

    flash('success', 'Pengaturan disimpan.');
    redirect('settings');
}
