-- =====================================================================
--  Skema database: Penawaran Harga & Invoice  (Supabase / PostgreSQL)
--  Jalankan seluruh isi file ini di Supabase > SQL Editor > New query > Run
--  Aman dijalankan berulang kali (idempotent).
-- =====================================================================

-- 1. Pengaturan perusahaan (hanya 1 baris, id = 1) ---------------------
create table if not exists public.settings (
    id                   smallint primary key default 1 check (id = 1),
    company_name         text not null default 'Nama Perusahaan Anda',
    address              text,
    phone                text,
    email                text,
    city                 text not null default 'Jakarta',
    logo_data            text,                    -- logo disimpan sebagai data URL (gambar kecil)
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
insert into public.settings (id, terms) values (
    1,
    E'Harga dapat berubah sewaktu-waktu tanpa pemberitahuan terlebih dahulu.\nPembayaran dilakukan melalui transfer ke rekening yang tertera.'
) on conflict (id) do nothing;

-- Upgrade: database lama (skema versi PHP) memakai kolom logo_path. Versi web memakai logo_data.
alter table public.settings add column if not exists logo_data text;

-- 2. Pelanggan -----------------------------------------------------------
create table if not exists public.customers (
    id          bigint generated always as identity primary key,
    name        text not null,
    address     text,
    phone       text,
    email       text,
    created_at  timestamptz not null default now()
);
create index if not exists customers_name_idx on public.customers (lower(name));

-- 3. Penawaran (Quotation) ----------------------------------------------
create table if not exists public.quotations (
    id                bigint generated always as identity primary key,
    number            text not null unique,
    customer_id       bigint references public.customers(id) on delete set null,
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
create index if not exists quotations_issue_date_idx on public.quotations (issue_date desc);

create table if not exists public.quotation_items (
    id                bigint generated always as identity primary key,
    quotation_id      bigint not null references public.quotations(id) on delete cascade,
    position          integer not null default 0,
    description       text not null,
    details           text,                     -- spesifikasi, 1 baris per spek
    qty               numeric(12,2) not null default 1,
    unit              text,
    unit_price        numeric(15,2) not null default 0,
    discount_percent  numeric(5,2)  not null default 0,
    line_total        numeric(15,2) not null default 0
);
create index if not exists quotation_items_qid_idx on public.quotation_items (quotation_id);

-- 4. Invoice -------------------------------------------------------------
create table if not exists public.invoices (
    id                bigint generated always as identity primary key,
    number            text not null unique,
    quotation_id      bigint references public.quotations(id) on delete set null,
    customer_id       bigint references public.customers(id) on delete set null,
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
create index if not exists invoices_issue_date_idx on public.invoices (issue_date desc);

create table if not exists public.invoice_items (
    id                bigint generated always as identity primary key,
    invoice_id        bigint not null references public.invoices(id) on delete cascade,
    position          integer not null default 0,
    description       text not null,
    details           text,
    qty               numeric(12,2) not null default 1,
    unit              text,
    unit_price        numeric(15,2) not null default 0,
    discount_percent  numeric(5,2)  not null default 0,
    line_total        numeric(15,2) not null default 0
);
create index if not exists invoice_items_iid_idx on public.invoice_items (invoice_id);

-- 5. Fungsi: nomor otomatis ---------------------------------------------
create or replace function public.next_doc_number(p_type text, p_date date default current_date)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_prefix text;
    v_stem   text;
    v_max    integer;
begin
    if p_type = 'quotation' then
        select coalesce(quotation_prefix, 'QT') into v_prefix from settings where id = 1;
        v_stem := coalesce(v_prefix, 'QT') || '/' || to_char(p_date, 'YYYY') || '/';
        select coalesce(max(substr(number, length(v_stem) + 1)::integer), 0) into v_max
          from quotations
         where left(number, length(v_stem)) = v_stem
           and substr(number, length(v_stem) + 1) ~ '^[0-9]+$';
    elsif p_type = 'invoice' then
        select coalesce(invoice_prefix, 'INV') into v_prefix from settings where id = 1;
        v_stem := coalesce(v_prefix, 'INV') || '/' || to_char(p_date, 'YYYY') || '/';
        select coalesce(max(substr(number, length(v_stem) + 1)::integer), 0) into v_max
          from invoices
         where left(number, length(v_stem)) = v_stem
           and substr(number, length(v_stem) + 1) ~ '^[0-9]+$';
    else
        raise exception 'Tipe dokumen tidak valid: %', p_type;
    end if;
    return v_stem || lpad((v_max + 1)::text, 4, '0');
end;
$$;

-- 6. Fungsi: simpan dokumen (header + item) dalam SATU transaksi -----------
--    Total dihitung ulang di server, jadi tidak bisa dimanipulasi dari browser.
create or replace function public.save_document(
    p_type  text,
    p_id    bigint,
    p_doc   jsonb,
    p_items jsonb
) returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_tbl        text;
    v_items_tbl  text;
    v_fk         text;
    v_d2         text;
    v_id         bigint := p_id;
    v_taxp       numeric;
    v_sub        numeric := 0;
    v_disc       numeric := 0;
    v_tax        numeric;
    v_total      numeric;
    v_status     text;
    v_pos        integer := 0;
    v_rows       integer := 0;
    v_qty        numeric;
    v_price      numeric;
    v_dp         numeric;
    v_gross      numeric;
    v_d          numeric;
    v_line       numeric;
    j            jsonb;
begin
    if p_type = 'quotation' then
        v_tbl := 'quotations'; v_items_tbl := 'quotation_items'; v_fk := 'quotation_id'; v_d2 := 'valid_until';
    elsif p_type = 'invoice' then
        v_tbl := 'invoices';   v_items_tbl := 'invoice_items';   v_fk := 'invoice_id';   v_d2 := 'due_date';
    else
        raise exception 'Tipe dokumen tidak valid: %', p_type;
    end if;

    v_taxp := least(100, greatest(0, coalesce(nullif(p_doc->>'tax_percent', '')::numeric, 0)));
    v_status := p_doc->>'status';

    -- Pass 1: hitung total
    for j in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
        if btrim(coalesce(j->>'description', '')) = '' then continue; end if;
        v_qty   := greatest(0, coalesce(nullif(j->>'qty', '')::numeric, 0));
        v_price := greatest(0, coalesce(nullif(j->>'unit_price', '')::numeric, 0));
        v_dp    := least(100, greatest(0, coalesce(nullif(j->>'discount_percent', '')::numeric, 0)));
        v_gross := v_qty * v_price;
        v_sub   := v_sub  + v_gross;
        v_disc  := v_disc + round(v_gross * v_dp / 100, 2);
    end loop;

    if v_sub = 0 and v_disc = 0 and not exists (
        select 1 from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e
         where btrim(coalesce(e->>'description', '')) <> ''
    ) then
        raise exception 'Minimal harus ada satu baris item dengan deskripsi';
    end if;

    v_tax   := round((v_sub - v_disc) * v_taxp / 100, 2);
    v_total := round(v_sub - v_disc + v_tax, 2);

    -- Header
    if v_id is null then
        execute format(
            'insert into %I (number, customer_id, customer_name, customer_address, customer_phone,
                             subject, issue_date, %I, status, tax_percent,
                             subtotal, discount_total, tax_amount, total, notes, terms)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id',
            v_tbl, v_d2)
        into v_id
        using p_doc->>'number',
              nullif(p_doc->>'customer_id', '')::bigint,
              p_doc->>'customer_name',
              nullif(p_doc->>'customer_address', ''),
              nullif(p_doc->>'customer_phone', ''),
              nullif(p_doc->>'subject', ''),
              coalesce(nullif(p_doc->>'issue_date', '')::date, current_date),
              nullif(p_doc->>'date2', '')::date,
              v_status, v_taxp, round(v_sub, 2), round(v_disc, 2), v_tax, v_total,
              nullif(p_doc->>'notes', ''),
              nullif(p_doc->>'terms', '');

        if p_type = 'invoice' then
            update invoices
               set quotation_id = nullif(p_doc->>'quotation_id', '')::bigint,
                   paid_at = case when v_status = 'paid' then now() else null end
             where id = v_id;
        end if;
    else
        execute format(
            'update %I set number=$1, customer_id=$2, customer_name=$3, customer_address=$4,
                           customer_phone=$5, subject=$6, issue_date=$7, %I=$8, status=$9,
                           tax_percent=$10, subtotal=$11, discount_total=$12, tax_amount=$13,
                           total=$14, notes=$15, terms=$16, updated_at=now()
              where id=$17',
            v_tbl, v_d2)
        using p_doc->>'number',
              nullif(p_doc->>'customer_id', '')::bigint,
              p_doc->>'customer_name',
              nullif(p_doc->>'customer_address', ''),
              nullif(p_doc->>'customer_phone', ''),
              nullif(p_doc->>'subject', ''),
              coalesce(nullif(p_doc->>'issue_date', '')::date, current_date),
              nullif(p_doc->>'date2', '')::date,
              v_status, v_taxp, round(v_sub, 2), round(v_disc, 2), v_tax, v_total,
              nullif(p_doc->>'notes', ''),
              nullif(p_doc->>'terms', ''),
              v_id;

        get diagnostics v_rows = row_count;     -- (EXECUTE tidak mengubah FOUND)
        if v_rows = 0 then
            raise exception 'Dokumen tidak ditemukan';
        end if;

        if p_type = 'invoice' then
            update invoices
               set paid_at = case when v_status = 'paid' then coalesce(paid_at, now()) else null end
             where id = v_id;
        end if;
    end if;

    -- Item: ganti seluruh baris
    execute format('delete from %I where %I = $1', v_items_tbl, v_fk) using v_id;

    for j in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
        if btrim(coalesce(j->>'description', '')) = '' then continue; end if;
        v_qty   := greatest(0, coalesce(nullif(j->>'qty', '')::numeric, 0));
        v_price := greatest(0, coalesce(nullif(j->>'unit_price', '')::numeric, 0));
        v_dp    := least(100, greatest(0, coalesce(nullif(j->>'discount_percent', '')::numeric, 0)));
        v_gross := v_qty * v_price;
        v_d     := round(v_gross * v_dp / 100, 2);
        v_line  := round(v_gross - v_d, 2);
        v_pos   := v_pos + 1;

        execute format(
            'insert into %I (%I, position, description, details, qty, unit, unit_price, discount_percent, line_total)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            v_items_tbl, v_fk)
        using v_id, v_pos, btrim(j->>'description'),
              nullif(btrim(coalesce(j->>'details', '')), ''),
              v_qty, nullif(btrim(coalesce(j->>'unit', '')), ''), v_price, v_dp, v_line;
    end loop;

    return v_id;
end;
$$;

-- 7. KEAMANAN: Row Level Security -----------------------------------------
-- Kunci "anon/publishable" Supabase bersifat PUBLIK (terlihat di browser).
-- Karena itu semua tabel dikunci: hanya user yang sudah LOGIN (role "authenticated")
-- yang boleh membaca/menulis. Pengunjung tanpa login tidak bisa apa-apa.
-- PENTING: matikan pendaftaran publik (Authentication > Sign In / Providers >
--          "Allow new users to sign up" = OFF) lalu buat user Anda secara manual.
alter table public.settings         enable row level security;
alter table public.customers        enable row level security;
alter table public.quotations       enable row level security;
alter table public.quotation_items  enable row level security;
alter table public.invoices         enable row level security;
alter table public.invoice_items    enable row level security;

do $$
declare t text;
begin
    foreach t in array array['settings','customers','quotations','quotation_items','invoices','invoice_items']
    loop
        execute format('drop policy if exists "staff_all" on public.%I', t);
        execute format(
            'create policy "staff_all" on public.%I for all to authenticated using (true) with check (true)', t);
    end loop;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke execute on function public.next_doc_number(text, date) from public, anon;
revoke execute on function public.save_document(text, bigint, jsonb, jsonb) from public, anon;
grant  execute on function public.next_doc_number(text, date) to authenticated;
grant  execute on function public.save_document(text, bigint, jsonb, jsonb) to authenticated;

-- =====================================================================
-- VERIFIKASI QR (halaman publik tanpa login)
-- Setiap dokumen punya kode acak (verify_token) yang dimuat di QR. Orang yang memindai
-- QR memanggil get_public_document() dengan kode itu dan hanya mendapat SATU dokumen.
-- Tabel tetap tertutup untuk anon; kode tidak bisa ditebak (UUID acak).
-- Aman dijalankan ulang; dokumen lama otomatis mendapat kode.
-- =====================================================================
alter table public.quotations add column if not exists verify_token uuid not null default gen_random_uuid();
alter table public.invoices   add column if not exists verify_token uuid not null default gen_random_uuid();
create unique index if not exists quotations_verify_token_key on public.quotations (verify_token);
create unique index if not exists invoices_verify_token_key   on public.invoices   (verify_token);

create or replace function public.get_public_document(p_type text, p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_doc   jsonb;
    v_items jsonb;
    v_set   jsonb;
begin
    if p_type = 'quotation' then
        select to_jsonb(q) || jsonb_build_object('date2', q.valid_until) into v_doc
          from public.quotations q where q.verify_token = p_token;
        if v_doc is null then return null; end if;
        select coalesce(jsonb_agg(to_jsonb(i) order by i.position, i.id), '[]'::jsonb) into v_items
          from public.quotation_items i where i.quotation_id = (v_doc->>'id')::bigint;
    elsif p_type = 'invoice' then
        select to_jsonb(v) || jsonb_build_object('date2', v.due_date) into v_doc
          from public.invoices v where v.verify_token = p_token;
        if v_doc is null then return null; end if;
        select coalesce(jsonb_agg(to_jsonb(i) order by i.position, i.id), '[]'::jsonb) into v_items
          from public.invoice_items i where i.invoice_id = (v_doc->>'id')::bigint;
    else
        return null;
    end if;

    select jsonb_build_object(
               'company_name', company_name, 'address', address, 'phone', phone, 'email', email,
               'city', city, 'logo_data', logo_data, 'bank_name', bank_name,
               'bank_account_no', bank_account_no, 'bank_account_holder', bank_account_holder,
               'signer_name', signer_name)
      into v_set from public.settings where id = 1;

    return jsonb_build_object('doc', v_doc - 'verify_token', 'items', v_items, 'settings', coalesce(v_set, '{}'::jsonb));
end;
$$;

revoke execute on function public.get_public_document(text, uuid) from public;
grant  execute on function public.get_public_document(text, uuid) to anon, authenticated;

