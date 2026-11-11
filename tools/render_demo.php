<?php
// Render halaman dengan DATA CONTOH (tanpa database) -> HTML statis di folder demo/.
// Pemakaian: php tools/render_demo.php /path/output
declare(strict_types=1);
require __DIR__ . '/../src/helpers.php';
require __DIR__ . '/../src/Database.php';
require __DIR__ . '/../src/Repositories.php';
date_default_timezone_set('Asia/Jakarta');
session_start();
$out = rtrim($argv[1] ?? __DIR__ . '/../demo', '/');
@mkdir("$out/assets", 0775, true);
foreach (glob(__DIR__ . '/../public/assets/*') as $f) copy($f, "$out/assets/" . basename($f));

// logo contoh
$im = imagecreatetruecolor(240, 240); imagesavealpha($im, true);
$bg = imagecolorallocate($im, 15, 118, 110); $wh = imagecolorallocate($im, 255, 255, 255);
imagefilledellipse($im, 120, 120, 230, 230, $bg); imagefilledellipse($im, 120, 120, 190, 190, $wh); imagefilledellipse($im, 120, 120, 170, 170, $bg);
imagestring($im, 5, 88, 108, 'DEMO LOGO', $wh); imagepng($im, "$out/logo.png");

$settings = ['company_name' => 'ONE COM', 'address' => "Harco Mangga Dua Plaza Lantai 2 No. 288E\nJakarta Pusat", 'phone' => '0812-0000-0000',
  'email' => 'penjualan@contoh.co.id', 'city' => 'Jakarta', 'logo_path' => 'logo.png', 'bank_name' => 'Bank Mandiri',
  'bank_account_no' => '11 5000 4977601', 'bank_account_holder' => 'Tri Yunariningsih', 'signer_name' => 'Tri Yunariningsih',
  'terms' => "Barang saat ini ready, harga dapat berubah sewaktu-waktu.\nGaransi resmi 2 tahun.\nPembayaran dilakukan melalui transfer ke rekening di atas.",
  'quotation_prefix' => 'QT', 'invoice_prefix' => 'INV', 'default_tax_percent' => 0, 'default_valid_days' => 14];

$doc = ['id' => 1, 'type' => 'quotation', 'number' => 'QT/2026/0001', 'customer_id' => 1, 'customer_name' => 'PT ShinWon Indonesia',
  'customer_address' => "Jl. Industri Raya No. 10\nSubang, Jawa Barat", 'customer_phone' => '0260-123456',
  'subject' => 'Penawaran Harga Laptop', 'issue_date' => '2026-11-06', 'date2' => '2026-11-20', 'status' => 'pending', 'tax_percent' => 0,
  'subtotal' => 13500000, 'discount_total' => 0, 'tax_amount' => 0, 'total' => 13500000,
  'notes' => 'Barang saat ini ready, harga dapat berubah sewaktu-waktu.', 'terms' => $settings['terms'],
  'items' => [
    ['description' => 'LENOVO V14 G5 IRL', 'details' => "Prosesor Core i3 1315U\nMemory 8GB\nSSD NVMe 512GB\nLayar 14\" FHD IPS", 'qty' => 1, 'unit' => 'unit', 'unit_price' => 11350000, 'discount_percent' => 0, 'line_total' => 11350000],
    ['description' => 'WINDOWS 11 PRO', 'details' => '', 'qty' => 1, 'unit' => 'lisensi', 'unit_price' => 800000, 'discount_percent' => 0, 'line_total' => 800000],
    ['description' => 'OFFICE PRO PLUS 2024', 'details' => '', 'qty' => 1, 'unit' => 'lisensi', 'unit_price' => 1250000, 'discount_percent' => 0, 'line_total' => 1250000],
    ['description' => 'ONGKIR', 'details' => '', 'qty' => 1, 'unit' => '', 'unit_price' => 100000, 'discount_percent' => 0, 'line_total' => 100000],
  ]];
$T = Documents::TYPES;
function save_page(string $file, callable $fn): void { ob_start(); $fn(); file_put_contents($file, ob_get_clean()); }

save_page("$out/print.html", fn() => render('print', ['doc' => $doc, 'type' => 'quotation', 'cfg' => $T['quotation'], 'settings' => $settings, 'showDiscount' => false, 'autoprint' => false], false));

// invoice dengan diskon + PPN
$inv = $doc; $inv['number'] = 'INV/2026/0001'; $inv['status'] = 'sent'; $inv['subject'] = 'Pengadaan Monitor'; $inv['tax_percent'] = 11;
$inv['items'] = [['description' => 'MONITOR LENOVO L24-4E 24"', 'details' => '', 'qty' => 6, 'unit' => 'unit', 'unit_price' => 1600000, 'discount_percent' => 5, 'line_total' => 9120000],
                 ['description' => 'ONGKIR', 'details' => '', 'qty' => 1, 'unit' => '', 'unit_price' => 150000, 'discount_percent' => 0, 'line_total' => 150000]];
$inv['subtotal'] = 9750000; $inv['discount_total'] = 480000; $inv['tax_amount'] = 1019700; $inv['total'] = 10289700; $inv['date2'] = '2026-11-20'; $inv['type']='invoice';
save_page("$out/print-invoice.html", fn() => render('print', ['doc' => $inv, 'type' => 'invoice', 'cfg' => $T['invoice'], 'settings' => $settings, 'showDiscount' => true, 'autoprint' => false], false));

$rows = [
 ['type'=>'invoice','id'=>1,'number'=>'INV/2026/0001','customer_name'=>'PT ShinWon Indonesia','subject'=>'Pengadaan Monitor','issue_date'=>'2026-11-10','date2'=>'2026-11-20','status'=>'sent','total'=>10289700],
 ['type'=>'quotation','id'=>1,'number'=>'QT/2026/0001','customer_name'=>'PT ShinWon Indonesia','subject'=>'Penawaran Harga Laptop','issue_date'=>'2026-11-06','date2'=>'2026-11-20','status'=>'pending','total'=>13500000],
 ['type'=>'quotation','id'=>2,'number'=>'QT/2026/0002','customer_name'=>'CV Maju Jaya','subject'=>'HP Spectre x360','issue_date'=>'2026-11-02','date2'=>null,'status'=>'approved','total'=>60598000],
 ['type'=>'invoice','id'=>2,'number'=>'INV/2026/0002','customer_name'=>'Cash - Tunai','subject'=>null,'issue_date'=>'2026-10-30','date2'=>null,'status'=>'paid','total'=>7000000],
];
$stats = ['quotation' => ['pending'=>['count'=>1,'sum'=>13500000],'approved'=>['count'=>1,'sum'=>60598000]], 'invoice' => ['sent'=>['count'=>1,'sum'=>10289700],'paid'=>['count'=>1,'sum'=>7000000]]];
save_page("$out/dashboard.html", fn() => render('dashboard', ['rows'=>$rows,'stats'=>$stats,'q'=>'','tab'=>'all','status'=>'']));

save_page("$out/form.html", fn() => render('form', ['doc'=>$doc,'type'=>'quotation','id'=>1,'numbers'=>['quotation'=>'QT/2026/0003','invoice'=>'INV/2026/0003'],
  'customers'=>[['id'=>1,'name'=>'PT ShinWon Indonesia','address'=>'Subang','phone'=>'0260']],'types'=>$T,'settings'=>$settings]));
save_page("$out/settings.html", fn() => render('settings', ['s'=>$settings]));
echo "OK\n";
