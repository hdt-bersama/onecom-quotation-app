<?php
declare(strict_types=1);

/* =====================================================================
 *  Settings  - identitas perusahaan (1 baris, id = 1)
 * ===================================================================== */
final class Settings
{
    public const FIELDS = [
        'company_name', 'address', 'phone', 'email', 'city', 'logo_path',
        'bank_name', 'bank_account_no', 'bank_account_holder', 'signer_name', 'terms',
        'quotation_prefix', 'invoice_prefix', 'default_tax_percent', 'default_valid_days',
    ];

    public static function get(): array
    {
        $row = Database::pdo()->query('SELECT * FROM settings WHERE id = 1')->fetch();
        if (!$row) {
            Database::pdo()->exec("INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING");
            $row = Database::pdo()->query('SELECT * FROM settings WHERE id = 1')->fetch();
        }
        return $row;
    }

    public static function save(array $d): void
    {
        $set = implode(', ', array_map(fn($f) => "$f = :$f", self::FIELDS));
        $stmt = Database::pdo()->prepare("UPDATE settings SET $set, updated_at = now() WHERE id = 1");
        foreach (self::FIELDS as $f) {
            $stmt->bindValue(":$f", $d[$f] ?? null);
        }
        $stmt->execute();
    }
}

/* =====================================================================
 *  Customers
 * ===================================================================== */
final class Customers
{
    public static function all(): array
    {
        return Database::pdo()
            ->query('SELECT id, name, address, phone FROM customers ORDER BY lower(name) LIMIT 500')
            ->fetchAll();
    }

    /** Simpan/perbarui pelanggan dari form dokumen, kembalikan id-nya. */
    public static function sync(?int $id, string $name, ?string $address, ?string $phone): int
    {
        $db = Database::pdo();

        if ($id) {
            $stmt = $db->prepare('UPDATE customers SET name = :n, address = :a, phone = :p WHERE id = :id');
            $stmt->execute([':n' => $name, ':a' => $address, ':p' => $phone, ':id' => $id]);
            if ($stmt->rowCount() > 0) {
                return $id;
            }
        }

        $stmt = $db->prepare('SELECT id FROM customers WHERE lower(name) = lower(:n) LIMIT 1');
        $stmt->execute([':n' => $name]);
        if ($found = $stmt->fetchColumn()) {
            $upd = $db->prepare('UPDATE customers SET address = :a, phone = :p WHERE id = :id');
            $upd->execute([':a' => $address, ':p' => $phone, ':id' => $found]);
            return (int)$found;
        }

        $ins = $db->prepare('INSERT INTO customers (name, address, phone) VALUES (:n, :a, :p) RETURNING id');
        $ins->execute([':n' => $name, ':a' => $address, ':p' => $phone]);
        return (int)$ins->fetchColumn();
    }
}

/* =====================================================================
 *  Documents - satu kelas untuk Penawaran (quotation) & Invoice
 *  Nama tabel/kolom berasal dari whitelist TYPES (bukan dari input user).
 * ===================================================================== */
final class Documents
{
    public const TYPES = [
        'quotation' => [
            'table'        => 'quotations',
            'items_table'  => 'quotation_items',
            'fk'           => 'quotation_id',
            'date2'        => 'valid_until',
            'date2_label'  => 'Berlaku s/d',
            'label'        => 'Penawaran',
            'title'        => 'PENAWARAN HARGA',
            'prefix_key'   => 'quotation_prefix',
            'statuses'     => ['pending' => 'Pending', 'approved' => 'Approved', 'rejected' => 'Rejected'],
            'default'      => 'pending',
        ],
        'invoice' => [
            'table'        => 'invoices',
            'items_table'  => 'invoice_items',
            'fk'           => 'invoice_id',
            'date2'        => 'due_date',
            'date2_label'  => 'Jatuh Tempo',
            'label'        => 'Invoice',
            'title'        => 'INVOICE',
            'prefix_key'   => 'invoice_prefix',
            'statuses'     => ['draft' => 'Draft', 'sent' => 'Sent', 'paid' => 'Paid'],
            'default'      => 'draft',
        ],
    ];

    /** Kolom header yang disimpan dari form (selain date2 & quotation_id). */
    private const FIELDS = [
        'number', 'customer_id', 'customer_name', 'customer_address', 'customer_phone',
        'subject', 'issue_date', 'status', 'tax_percent',
        'subtotal', 'discount_total', 'tax_amount', 'total', 'notes', 'terms',
    ];

    private PDO $db;
    private array $c;

    public function __construct(private string $type)
    {
        if (!isset(self::TYPES[$type])) {
            throw new InvalidArgumentException("Tipe dokumen tidak dikenal: $type");
        }
        $this->c  = self::TYPES[$type];
        $this->db = Database::pdo();
    }

    public static function isType(mixed $t): bool
    {
        return is_string($t) && isset(self::TYPES[$t]);
    }

    public function cfg(): array
    {
        return $this->c;
    }

    /* ---------- Hitung total (otoritatif, dijalankan di server) ---------- */

    public static function calculate(array $items, float $taxPercent): array
    {
        $clean = [];
        $subtotal = 0.0;
        $discount = 0.0;
        $pos = 0;

        foreach ($items as $it) {
            $desc = trim((string)($it['description'] ?? ''));
            if ($desc === '') {
                continue;
            }
            $qty   = max(0.0, (float)($it['qty'] ?? 0));
            $price = max(0.0, (float)($it['unit_price'] ?? 0));
            $dp    = min(100.0, max(0.0, (float)($it['discount_percent'] ?? 0)));

            $gross = $qty * $price;
            $disc  = round($gross * $dp / 100, 2);
            $line  = round($gross - $disc, 2);

            $subtotal += $gross;
            $discount += $disc;
            $clean[] = [
                'position'         => ++$pos,
                'description'      => $desc,
                'details'          => trim((string)($it['details'] ?? '')) ?: null,
                'qty'              => $qty,
                'unit'             => trim((string)($it['unit'] ?? '')) ?: null,
                'unit_price'       => $price,
                'discount_percent' => $dp,
                'line_total'       => $line,
            ];
        }

        $taxPercent = min(100.0, max(0.0, $taxPercent));
        $net   = $subtotal - $discount;
        $tax   = round($net * $taxPercent / 100, 2);
        $total = round($net + $tax, 2);

        return [$clean, [
            'subtotal'       => round($subtotal, 2),
            'discount_total' => round($discount, 2),
            'tax_amount'     => $tax,
            'total'          => $total,
        ]];
    }

    /* ---------- Baca ---------- */

    public function all(string $q = '', string $status = '', int $limit = 200): array
    {
        $t = $this->c['table'];
        $d2 = $this->c['date2'];
        $sql = "SELECT id, number, customer_name, subject, issue_date, $d2 AS date2, status, total
                  FROM $t WHERE 1=1";
        $p = [];
        if ($q !== '') {
            $sql .= ' AND (number ILIKE :q1 OR customer_name ILIKE :q2 OR COALESCE(subject, \'\') ILIKE :q3)';
            $like = '%' . addcslashes($q, '%_\\') . '%';
            $p = [':q1' => $like, ':q2' => $like, ':q3' => $like];
        }
        if ($status !== '' && isset($this->c['statuses'][$status])) {
            $sql .= ' AND status = :st';
            $p[':st'] = $status;
        }
        $sql .= ' ORDER BY issue_date DESC, id DESC LIMIT ' . max(1, $limit);

        $stmt = $this->db->prepare($sql);
        $stmt->execute($p);
        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $t = $this->c['table'];
        $d2 = $this->c['date2'];
        $stmt = $this->db->prepare("SELECT *, $d2 AS date2 FROM $t WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $doc = $stmt->fetch();
        if (!$doc) {
            return null;
        }

        $it = $this->db->prepare(
            "SELECT description, details, qty, unit, unit_price, discount_percent, line_total
               FROM {$this->c['items_table']} WHERE {$this->c['fk']} = :id ORDER BY position, id"
        );
        $it->execute([':id' => $id]);
        $doc['items'] = $it->fetchAll();
        $doc['type']  = $this->type;
        return $doc;
    }

    /** Ringkasan untuk dashboard: [status => ['count' => n, 'sum' => x]] */
    public function summary(): array
    {
        $rows = $this->db->query(
            "SELECT status, COUNT(*) AS c, COALESCE(SUM(total), 0) AS s FROM {$this->c['table']} GROUP BY status"
        )->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[$r['status']] = ['count' => (int)$r['c'], 'sum' => (float)$r['s']];
        }
        return $out;
    }

    public function nextNumber(string $issueDate, string $prefix): string
    {
        $year = date('Y', strtotime($issueDate) ?: time());
        $stem = $prefix . '/' . $year . '/';
        $stmt = $this->db->prepare("SELECT number FROM {$this->c['table']} WHERE number LIKE :p");
        $stmt->execute([':p' => addcslashes($stem, '%_\\') . '%']);
        $max = 0;
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $num) {
            $max = max($max, (int)substr((string)$num, strlen($stem)));
        }
        return sprintf('%s%04d', $stem, $max + 1);
    }

    /* ---------- Tulis ---------- */

    /**
     * Simpan dokumen (insert bila $id null, update bila ada). $doc['items'] dihitung ulang di server.
     * @return int id dokumen
     */
    public function save(?int $id, array $doc): int
    {
        [$items, $tot] = self::calculate($doc['items'] ?? [], (float)($doc['tax_percent'] ?? 0));
        $doc = array_merge($doc, $tot);

        $d2   = $this->c['date2'];
        $cols = array_merge(self::FIELDS, [$d2]);
        $val  = fn(string $col) => $doc[$col === $d2 ? 'date2' : $col] ?? null;

        $this->db->beginTransaction();
        try {
            if ($id) {
                $set = implode(', ', array_map(fn($c) => "$c = :$c", $cols));
                $extra = $this->type === 'invoice'
                    ? ", paid_at = CASE WHEN :status_chk = 'paid' THEN COALESCE(paid_at, now()) ELSE NULL END"
                    : '';
                $stmt = $this->db->prepare(
                    "UPDATE {$this->c['table']} SET $set, updated_at = now() $extra WHERE id = :id"
                );
                foreach ($cols as $col) {
                    $stmt->bindValue(":$col", $val($col));
                }
                if ($this->type === 'invoice') {
                    $stmt->bindValue(':status_chk', $doc['status']);
                }
                $stmt->bindValue(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
            } else {
                $insCols = $cols;
                if ($this->type === 'invoice') {
                    $insCols[] = 'quotation_id';
                }
                $stmt = $this->db->prepare(
                    "INSERT INTO {$this->c['table']} (" . implode(', ', $insCols) . ')
                     VALUES (' . implode(', ', array_map(fn($c) => ":$c", $insCols)) . ') RETURNING id'
                );
                foreach ($insCols as $col) {
                    $stmt->bindValue(":$col", $col === 'quotation_id' ? ($doc['quotation_id'] ?? null) : $val($col));
                }
                $stmt->execute();
                $id = (int)$stmt->fetchColumn();
                if ($this->type === 'invoice' && ($doc['status'] ?? '') === 'paid') {
                    $this->db->prepare('UPDATE invoices SET paid_at = now() WHERE id = :id')->execute([':id' => $id]);
                }
            }

            // Ganti seluruh baris item (cara paling sederhana & konsisten untuk "Edit Ulang")
            $fk = $this->c['fk'];
            $this->db->prepare("DELETE FROM {$this->c['items_table']} WHERE $fk = :id")->execute([':id' => $id]);

            $ins = $this->db->prepare(
                "INSERT INTO {$this->c['items_table']}
                    ($fk, position, description, details, qty, unit, unit_price, discount_percent, line_total)
                 VALUES (:fk, :position, :description, :details, :qty, :unit, :unit_price, :discount_percent, :line_total)"
            );
            foreach ($items as $it) {
                $ins->execute([':fk' => $id] + array_combine(
                    array_map(fn($k) => ":$k", array_keys($it)),
                    array_values($it)
                ));
            }

            $this->db->commit();
            return $id;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function delete(int $id): void
    {
        $this->db->prepare("DELETE FROM {$this->c['table']} WHERE id = :id")->execute([':id' => $id]);
    }

    public function setStatus(int $id, string $status): void
    {
        if (!isset($this->c['statuses'][$status])) {
            throw new InvalidArgumentException('Status tidak valid');
        }
        if ($this->type === 'invoice') {
            $stmt = $this->db->prepare(
                "UPDATE invoices SET status = :s,
                        paid_at = CASE WHEN :s2 = 'paid' THEN COALESCE(paid_at, now()) ELSE NULL END,
                        updated_at = now()
                  WHERE id = :id"
            );
            $stmt->execute([':s' => $status, ':s2' => $status, ':id' => $id]);
        } else {
            $stmt = $this->db->prepare('UPDATE quotations SET status = :s, updated_at = now() WHERE id = :id');
            $stmt->execute([':s' => $status, ':id' => $id]);
        }
    }

    /** Buat invoice (draft) dari sebuah penawaran. @return int id invoice baru */
    public static function quotationToInvoice(int $quotationId, array $settings): ?int
    {
        $q = (new self('quotation'))->find($quotationId);
        if (!$q) {
            return null;
        }
        $inv  = new self('invoice');
        $date = date('Y-m-d');
        $days = (int)($settings['default_valid_days'] ?? 14);

        return $inv->save(null, [
            'number'           => $inv->nextNumber($date, $settings['invoice_prefix'] ?: 'INV'),
            'quotation_id'     => $quotationId,
            'customer_id'      => $q['customer_id'],
            'customer_name'    => $q['customer_name'],
            'customer_address' => $q['customer_address'],
            'customer_phone'   => $q['customer_phone'],
            'subject'          => $q['subject'],
            'issue_date'       => $date,
            'date2'            => date('Y-m-d', strtotime("+$days days")),
            'status'           => 'draft',
            'tax_percent'      => $q['tax_percent'],
            'notes'            => $q['notes'],
            'terms'            => $q['terms'],
            'items'            => $q['items'],
        ]);
    }
}
