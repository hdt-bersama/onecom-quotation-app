-- =====================================================================
--  Skema database: Sistem Penawaran Harga & Invoice  (Supabase / PostgreSQL)
--  Jalankan seluruh isi file ini di Supabase > SQL Editor > New query > Run
--  Aman dijalankan berulang kali (idempotent).
-- =====================================================================

-- 1. Pengaturan perusahaan (hanya 1 baris, id = 1) ---------------------
create table if not exists settings (
    id                   smallint primary key default 1 check (id = 1),
    company_name         text not null default 'Nama Perusahaan Anda',
    address              text,
    phone                text,
    email                text,
    city                 text not null default 'Jakarta',
    logo_path            text,
    bank_name            text,
    bank_account_no      text,
    bank_account_holder  text,
    signer_name          text,
    terms                text,
    quotation_prefix     text not null default 'QT',
    invoice_prefix       text not null default 'INV',
    default_tax_percent  numeric(5,2) not null default 0,
    default_valid_days   integer not null default 14,
    updated_at           timestamptz not null default now()
);
insert into settings (id, terms) values (
    1,
    E'Harga dapat berubah sewaktu-waktu tanpa pemberitahuan terlebih dahulu.\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan, kecuali ada garansi resmi.\nPembayaran dilakukan melalui transfer ke rekening yang tertera.'
) on conflict (id) do nothing;

-- 2. Pelanggan -----------------------------------------------------------
create table if not exists customers (
    id          bigint generated always as identity primary key,
    name        text not null,
    address     text,
    phone       text,
    email       text,
    created_at  timestamptz not null default now()
);
create index if not exists customers_name_idx on customers (lower(name));

-- 3. Penawaran (Quotation) ----------------------------------------------
create table if not exists quotations (
    id                bigint generated always as identity primary key,
    number            text not null unique,
    customer_id       bigint references customers(id) on delete set null,
    customer_name     text not null,            -- snapshot, agar dokumen lama tidak berubah
    customer_address  text,
    customer_phone    text,
    subject           text,                     -- perihal
    issue_date        date not null default current_date,
    valid_until       date,
    status            text not null default 'pending'
                      check (status in ('pending','approved','rejected')),
    tax_percent       numeric(5,2)  not null default 0,
    subtotal          numeric(15,2) not null default 0,
    discount_total    numeric(15,2) not null default 0,
    tax_amount        numeric(15,2) not null default 0,
    total             numeric(15,2) not null default 0,
    notes             text,
    terms             text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);
create index if not exists quotations_issue_date_idx on quotations (issue_date desc);

create table if not exists quotation_items (
    id                bigint generated always as identity primary key,
    quotation_id      bigint not null references quotations(id) on delete cascade,
    position          integer not null default 0,
    description       text not null,
    details           text,                     -- spesifikasi, 1 baris per spek
    qty               numeric(12,2) not null default 1,
    unit              text,
    unit_price        numeric(15,2) not null default 0,
    discount_percent  numeric(5,2)  not null default 0,
    line_total        numeric(15,2) not null default 0
);
create index if not exists quotation_items_qid_idx on quotation_items (quotation_id);

-- 4. Invoice -------------------------------------------------------------
create table if not exists invoices (
    id                bigint generated always as identity primary key,
    number            text not null unique,
    quotation_id      bigint references quotations(id) on delete set null,
    customer_id       bigint references customers(id) on delete set null,
    customer_name     text not null,
    customer_address  text,
    customer_phone    text,
    subject           text,
    issue_date        date not null default current_date,
    due_date          date,
    status            text not null default 'draft'
                      check (status in ('draft','sent','paid')),
    paid_at           timestamptz,
    tax_percent       numeric(5,2)  not null default 0,
    subtotal          numeric(15,2) not null default 0,
    discount_total    numeric(15,2) not null default 0,
    tax_amount        numeric(15,2) not null default 0,
    total             numeric(15,2) not null default 0,
    notes             text,
    terms             text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);
create index if not exists invoices_issue_date_idx on invoices (issue_date desc);

create table if not exists invoice_items (
    id                bigint generated always as identity primary key,
    invoice_id        bigint not null references invoices(id) on delete cascade,
    position          integer not null default 0,
    description       text not null,
    details           text,
    qty               numeric(12,2) not null default 1,
    unit              text,
    unit_price        numeric(15,2) not null default 0,
    discount_percent  numeric(5,2)  not null default 0,
    line_total        numeric(15,2) not null default 0
);
create index if not exists invoice_items_iid_idx on invoice_items (invoice_id);

-- 5. KEAMANAN: aktifkan Row Level Security ------------------------------
-- Supabase otomatis membuka tabel schema "public" lewat REST API (anon key).
-- Dengan RLS aktif TANPA policy, API publik tidak bisa membaca/menulis apa pun.
-- Aplikasi PHP ini tetap berjalan karena konek langsung sebagai role "postgres"
-- (role tersebut melewati RLS).
alter table settings         enable row level security;
alter table customers        enable row level security;
alter table quotations       enable row level security;
alter table quotation_items  enable row level security;
alter table invoices         enable row level security;
alter table invoice_items    enable row level security;
