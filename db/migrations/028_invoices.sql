-- 028: Facturile din site (etapa 1: în aplicație; trimiterea în SPV vine în etapa 2).
--
-- Cum merge:
--   1. când confirmi o comandă cu livrare (curier sau Galați), apare singură o ciornă de factură;
--      la ridicarea din magazin plata trece de obicei prin casa de marcat, așa că ciorna o faci
--      tu, din pagina comenzii, doar dacă clientul vrea factură
--   2. în ciornă poți corecta datele clientului (nume, CUI sau CNP, adresă) și mențiunile
--   3. „Emite factura”: primește următorul număr din seria activă (prima: PGW, de la 3000)
--      și data de azi. De acum nu se mai schimbă și nu se mai șterge
--   4. o greșeală sau un retur se rezolvă prin stornare: o factură nouă, cu minus, care trimite
--      la cea inițială (toată factura sau doar unele produse)
--
-- Banii: prețurile din magazin includ TVA. Pe factură, fiecare rând are valoarea fără TVA și TVA-ul,
-- calculate din valoarea cu TVA, iar totalul e exact cât plătește clientul. Pe fiecare cotă, TVA-ul
-- se potrivește cu baza (așa îl va verifica și e-Factura). Livrarea, taxa de plată și reducerea
-- urmează cota de TVA a produselor (Codul fiscal, art. 286): la cote diferite, se împart proporțional.
--
-- Se poate rula de mai multe ori.

begin;

-- ---------- 1. Seriile și numărătoarea lor ----------

-- Fiecare serie folosită vreodată, cu numărul pe care îl va primi următoarea factură din ea

create table if not exists sales.invoice_series_counters (
    code        text primary key check (code ~ '^[A-Z][A-Z0-9]{0,9}$'),
    next_number integer not null check (next_number between 1 and 999999999),
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
);

-- O singură serie activă odată
create unique index if not exists invoice_series_one_active on sales.invoice_series_counters (is_active) where is_active;

-- Seria site-ului: PGW, de la 3000. Codul îl poți schimba din admin până la prima factură.
insert into sales.invoice_series_counters (code, next_number)
select 'PGW', 3000
where not exists (select 1 from sales.invoice_series_counters);

-- ---------- 2. Facturile și rândurile lor ----------

create table if not exists sales.invoices (
    id             uuid primary key default gen_random_uuid(),
    kind           text not null default 'invoice' check (kind in ('invoice', 'storno')),
    status         text not null default 'draft' check (status in ('draft', 'issued')),
    order_id       uuid not null references sales.orders (id),
    storno_of      uuid references sales.invoices (id),
    -- Primite la emitere
    series         text references sales.invoice_series_counters (code),
    number         integer,
    issue_date     date,
    -- Vânzătorul, copiat din datele firmei la emitere: rămâne așa chiar dacă datele firmei se schimbă
    seller_name    text,
    seller_cui     text,
    seller_reg_com text,
    seller_address text,
    -- Cumpărătorul, copiat din comandă; în ciornă se poate corecta
    buyer_name     text not null check (char_length(buyer_name) between 1 and 200),
    buyer_cui      text check (buyer_cui ~ '^(RO)?[0-9]{2,13}$'), -- CUI-ul firmei sau CNP-ul clientului
    buyer_reg_com  text check (char_length(buyer_reg_com) <= 40),
    buyer_address  text check (char_length(buyer_address) <= 300),
    buyer_email    text,
    payment_method text,
    note           text check (char_length(note) <= 500),
    total_net      numeric(12, 2) not null default 0,
    total_vat      numeric(12, 2) not null default 0,
    total          numeric(12, 2) not null default 0,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    issued_at      timestamptz,
    issued_by      uuid references auth.users (id) on delete set null,
    constraint invoices_series_number_key unique (series, number),
    constraint invoices_issued_complete check (
        status = 'draft'
        or (series is not null and number is not null and issue_date is not null and issued_at is not null
            and seller_cui is not null)
    ),
    constraint invoices_draft_unnumbered check (status = 'issued' or (series is null and number is null)),
    constraint invoices_storno_link check ((kind = 'storno') = (storno_of is not null))
);

create index if not exists invoices_order_id_idx on sales.invoices (order_id);
create index if not exists invoices_storno_of_idx on sales.invoices (storno_of);
create index if not exists invoices_status_idx on sales.invoices (status, created_at desc);

create table if not exists sales.invoice_lines (
    id             uuid primary key default gen_random_uuid(),
    invoice_id     uuid not null references sales.invoices (id) on delete cascade,
    line_no        integer not null,
    description    text not null,
    unit           text not null default 'buc',
    quantity       numeric(12, 3) not null check (quantity <> 0), -- cu minus la stornare
    unit_price_net numeric(14, 4) not null check (unit_price_net >= 0),
    vat_rate       numeric(4, 2) not null check (vat_rate >= 0),
    net            numeric(12, 2) not null,
    vat            numeric(12, 2) not null,
    gross          numeric(12, 2) not null,
    order_item_id  uuid references sales.order_items (id),
    storno_of_line uuid references sales.invoice_lines (id), -- la stornare: rândul stornat
    constraint invoice_lines_line_no_key unique (invoice_id, line_no),
    constraint invoice_lines_gross_check check (gross = net + vat)
);

create index if not exists invoice_lines_invoice_id_idx on sales.invoice_lines (invoice_id);
create index if not exists invoice_lines_storno_of_line_idx on sales.invoice_lines (storno_of_line);

-- ---------- 3. Paza: o factură emisă nu se mai schimbă ----------

create or replace function sales.protect_issued_invoices()
    returns trigger
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
begin
    if old.status = 'issued' then
        raise exception 'Factura % % e emisă: nu se mai schimbă și nu se șterge. O corectezi prin stornare.',
            old.series, old.number;
    end if;
    if tg_op = 'DELETE' then
        return old;
    end if;
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists invoices_protect on sales.invoices;
create trigger invoices_protect
    before update or delete on sales.invoices
    for each row
    execute function sales.protect_issued_invoices();

create or replace function sales.protect_issued_invoice_lines()
    returns trigger
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
begin
    if exists (select 1 from sales.invoices i where i.id in (old.invoice_id, new.invoice_id) and i.status = 'issued') then
        raise exception 'Rândurile unei facturi emise nu se mai schimbă.';
    end if;
    return coalesce(new, old);
end;
$$;

drop trigger if exists invoice_lines_protect on sales.invoice_lines;
create trigger invoice_lines_protect
    before insert or update or delete on sales.invoice_lines
    for each row
    execute function sales.protect_issued_invoice_lines();

-- ---------- 4. Ajutoare (nu apar în API) ----------

-- CUI: ultima cifră e cifra de control (cheia 753217532), ca în web/lib/anaf.ts
create or replace function sales.is_valid_cui(code text)
    returns boolean
    language sql
    immutable
    strict
    set search_path = pg_catalog, pg_temp
as $$
    select case
        when d.digits !~ '^[0-9]{2,10}$' then false
        else (
            select sum(substr(lpad(left(d.digits, -1), 9, '0'), k, 1)::integer * substr('753217532', k, 1)::integer)
            from generate_series(1, 9) k
        ) * 10 % 11 % 10 = right(d.digits, 1)::integer
    end
    from (select regexp_replace(upper(code), '^RO', '') as digits) d;
$$;

-- CNP: 13 cifre, ultima e cifra de control (cheia 279146358279; restul 10 devine 1)
create or replace function sales.is_valid_cnp(code text)
    returns boolean
    language sql
    immutable
    strict
    set search_path = pg_catalog, pg_temp
as $$
    select case
        when code !~ '^[1-9][0-9]{12}$' then false
        else (
            select case when t.s % 11 = 10 then 1 else t.s % 11 end
            from (
                select sum(substr(code, k, 1)::integer * substr('279146358279', k, 1)::integer) as s
                from generate_series(1, 12) k
            ) t
        ) = right(code, 1)::integer
    end;
$$;

-- Cât se mai poate storna dintr-un rând (în bucăți); stornările emise se scad
create or replace function sales.invoice_lines_remaining_quantity(l sales.invoice_lines)
    returns numeric
    language sql
    stable
    set search_path = pg_catalog, pg_temp
as $$
    select abs(l.quantity) - coalesce((
        select sum(abs(s.quantity))
        from sales.invoice_lines s
        join sales.invoices si on si.id = s.invoice_id
        where s.storno_of_line = l.id
          and si.status = 'issued'
    ), 0);
$$;

-- Se poate face o factură nouă pentru comandă? Da, dacă e confirmată, n-are deja o ciornă
-- și orice factură emisă înainte a fost stornată în întregime
create or replace function sales.orders_can_invoice(o sales.orders)
    returns boolean
    language sql
    stable
    set search_path = pg_catalog, pg_temp
as $$
    select o.status in ('confirmed', 'ready_for_pickup', 'shipped', 'delivered')
       and not exists (
           select 1 from sales.invoices i
           where i.order_id = o.id and i.kind = 'invoice' and i.status = 'draft'
       )
       and not exists (
           select 1
           from sales.invoice_lines l
           join sales.invoices i on i.id = l.invoice_id
           where i.order_id = o.id
             and i.kind = 'invoice'
             and i.status = 'issued'
             and sales.invoice_lines_remaining_quantity(l) > 0
       );
$$;

-- Totalurile facturii, din rânduri
create or replace function sales.update_invoice_totals(target uuid)
    returns void
    language sql
    set search_path = pg_catalog, pg_temp
as $$
    update sales.invoices i
    set total_net = t.net,
        total_vat = t.vat,
        total     = t.gross
    from (
        select coalesce(sum(l.net), 0) as net, coalesce(sum(l.vat), 0) as vat, coalesce(sum(l.gross), 0) as gross
        from sales.invoice_lines l
        where l.invoice_id = target
    ) t
    where i.id = target;
$$;

-- Din valoarea cu TVA a fiecărui rând: valoarea fără TVA, TVA-ul și prețul unitar fără TVA
create or replace function sales.compute_invoice_amounts(target uuid)
    returns void
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_group  record;
    v_target numeric;
begin
    update sales.invoice_lines l
    set net = round(l.gross / (1 + l.vat_rate / 100), 2),
        vat = l.gross - round(l.gross / (1 + l.vat_rate / 100), 2)
    where l.invoice_id = target;

    -- Pe fiecare cotă, baza se rotunjește o singură dată, din totalul cu TVA. Diferența de 1–2 bani
    -- față de suma rândurilor o punem pe cel mai mare rând din grupă.
    for v_group in
        select l.vat_rate, sum(l.gross) as gross, sum(l.net) as net
        from sales.invoice_lines l
        where l.invoice_id = target
        group by l.vat_rate
    loop
        v_target := round(v_group.gross / (1 + v_group.vat_rate / 100), 2);
        if v_target <> v_group.net then
            update sales.invoice_lines l
            set net = l.net + (v_target - v_group.net),
                vat = l.vat - (v_target - v_group.net)
            where l.id = (
                select l2.id
                from sales.invoice_lines l2
                where l2.invoice_id = target and l2.vat_rate = v_group.vat_rate
                order by abs(l2.gross) desc, l2.line_no
                limit 1
            );
        end if;
    end loop;

    update sales.invoice_lines l
    set unit_price_net = round(l.net / l.quantity, 4)
    where l.invoice_id = target;

    perform sales.update_invoice_totals(target);
end;
$$;

-- Rândurile facturii, din comandă: produsele, apoi livrarea, taxa de plată și reducerea
create or replace function sales.add_order_invoice_lines(target uuid, source sales.orders)
    returns void
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_line   integer := 0;
    v_item   record;
    v_charge record;
    v_rate   record;
    v_goods  numeric;
    v_rates  integer;
    v_k      integer;
    v_left   numeric;
    v_part   numeric;
begin
    for v_item in
        select oi.id, oi.product_name, oi.size_label, oi.quantity, oi.vat_rate, oi.line_total
        from sales.order_items oi
        where oi.order_id = source.id
        order by oi.product_name, oi.size_label, oi.id
    loop
        v_line := v_line + 1;
        insert into sales.invoice_lines
            (invoice_id, line_no, description, quantity, unit_price_net, vat_rate, net, vat, gross, order_item_id)
        values (target, v_line, btrim(v_item.product_name || ' ' || v_item.size_label), v_item.quantity,
                0, v_item.vat_rate, 0, v_item.line_total, v_item.line_total, v_item.id);
    end loop;

    -- Valoarea produselor, ca să împărțim livrarea pe cote
    select coalesce(sum(oi.line_total), 0), count(distinct oi.vat_rate)
    into v_goods, v_rates
    from sales.order_items oi
    where oi.order_id = source.id;

    for v_charge in
        select c.description, c.amount, c.quantity
        from (values (source.delivery_name, source.shipping_total, 1),
                     ('Taxă: ' || source.payment_name, source.payment_fee, 1),
                     ('Reducere', source.discount_total, -1)) as c (description, amount, quantity)
        where c.amount > 0
    loop
        v_left := v_charge.amount;
        v_k := 0;
        for v_rate in
            select oi.vat_rate, sum(oi.line_total) as gross
            from sales.order_items oi
            where oi.order_id = source.id
            group by oi.vat_rate
            order by oi.vat_rate desc
        loop
            v_k := v_k + 1;
            -- Ultima cotă primește restul, ca suma părților să fie exact cât e în comandă
            v_part := case
                          when v_k = v_rates or v_goods = 0 then v_left
                          else round(v_charge.amount * v_rate.gross / v_goods, 2)
                      end;
            v_left := v_left - v_part;
            continue when v_part = 0;

            v_line := v_line + 1;
            insert into sales.invoice_lines (invoice_id, line_no, description, quantity, unit_price_net, vat_rate, net, vat, gross)
            values (target, v_line,
                    v_charge.description
                        || case when v_rates > 1 then ' – cota TVA ' || trim_scale(v_rate.vat_rate) || '%' else '' end,
                    v_charge.quantity, 0, v_rate.vat_rate, 0, v_charge.quantity * v_part, v_charge.quantity * v_part);
        end loop;
    end loop;

    perform sales.compute_invoice_amounts(target);
end;
$$;

-- ---------- 5. Ce face adminul ----------

-- Ciorna facturii pentru o comandă confirmată
create or replace function sales.create_invoice_draft(order_id uuid)
    returns sales.invoices
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_order   sales.orders;
    v_invoice sales.invoices;
    v_cui     text;
begin
    select o.* into v_order
    from sales.orders o
    where o.id = create_invoice_draft.order_id
    for update;

    if v_order.id is null then
        raise exception 'Comanda nu există.';
    end if;
    if v_order.status not in ('confirmed', 'ready_for_pickup', 'shipped', 'delivered') then
        raise exception 'Factura se face după ce confirmi comanda (comanda #% nu e confirmată sau e anulată).',
            v_order.order_number;
    end if;
    if not sales.orders_can_invoice(v_order) then
        raise exception 'Comanda #% are deja o factură. Pentru una nouă, stornează-o întâi pe cea veche.',
            v_order.order_number;
    end if;

    v_cui := nullif(upper(regexp_replace(coalesce(v_order.company_cui, ''), '\s', '', 'g')), '');
    if v_cui !~ '^(RO)?[0-9]{2,10}$' then
        v_cui := null; -- un CUI ciudat nu ajunge pe factură; îl corectezi în ciornă
    end if;

    insert into sales.invoices
        (kind, order_id, buyer_name, buyer_cui, buyer_reg_com, buyer_address, buyer_email, payment_method)
    values (
        'invoice',
        v_order.id,
        left(coalesce(v_order.company_name, v_order.customer_name, v_order.first_name), 200),
        v_cui,
        nullif(btrim(v_order.company_reg_no), ''),
        case
            when v_order.company_name is not null and v_order.company_address is not null then v_order.company_address
            else nullif(concat_ws(', ', v_order.address, v_order.city, 'jud. ' || v_order.county, v_order.postal_code), '')
        end,
        v_order.email,
        v_order.payment_name
    )
    returning * into v_invoice;

    perform sales.add_order_invoice_lines(v_invoice.id, v_order);

    select i.* into v_invoice from sales.invoices i where i.id = v_invoice.id;
    return v_invoice;
end;
$$;

-- Corecturi în ciornă: datele clientului și mențiunile. La stornare, clientul rămâne cel
-- de pe factura inițială, deci se schimbă doar mențiunile.
create or replace function sales.update_invoice_draft(
    invoice_id    uuid,
    buyer_name    text,
    buyer_cui     text,
    buyer_reg_com text,
    buyer_address text,
    note          text
)
    returns sales.invoices
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_invoice sales.invoices;
    v_name    text := btrim(coalesce(update_invoice_draft.buyer_name, ''));
    v_cui     text := nullif(upper(regexp_replace(coalesce(update_invoice_draft.buyer_cui, ''), '\s', '', 'g')), '');
    v_reg_com text := nullif(btrim(update_invoice_draft.buyer_reg_com), '');
    v_address text := nullif(btrim(update_invoice_draft.buyer_address), '');
    v_note    text := nullif(btrim(update_invoice_draft.note), '');
begin
    select i.* into v_invoice
    from sales.invoices i
    where i.id = update_invoice_draft.invoice_id
    for update;

    if v_invoice.id is null then
        raise exception 'Factura nu există.';
    end if;
    if v_invoice.status <> 'draft' then
        raise exception 'Factura e emisă: nu se mai schimbă. O corectezi prin stornare.';
    end if;
    if char_length(v_note) > 500 then
        raise exception 'Mențiunile sunt prea lungi (cel mult 500 de caractere).';
    end if;

    if v_invoice.kind = 'storno' then
        update sales.invoices i set note = v_note where i.id = v_invoice.id returning * into v_invoice;
        return v_invoice;
    end if;

    if char_length(v_name) not between 1 and 200 then
        raise exception 'Scrie numele clientului sau al firmei.';
    end if;
    if v_cui is not null then
        if v_cui ~ '^[0-9]{13}$' then
            if not sales.is_valid_cnp(v_cui) then
                raise exception 'CNP-ul nu e corect. Verifică cifrele.';
            end if;
        elsif not sales.is_valid_cui(v_cui) then
            raise exception 'CUI-ul nu e corect. Verifică cifrele (cu sau fără RO în față).';
        end if;
    end if;
    if char_length(v_reg_com) > 40 then
        raise exception 'Numărul de la Registrul Comerțului e prea lung.';
    end if;
    if char_length(v_address) > 300 then
        raise exception 'Adresa e prea lungă (cel mult 300 de caractere).';
    end if;

    update sales.invoices i
    set buyer_name    = v_name,
        buyer_cui     = v_cui,
        buyer_reg_com = v_reg_com,
        buyer_address = v_address,
        note          = v_note
    where i.id = v_invoice.id
    returning * into v_invoice;

    return v_invoice;
end;
$$;

-- O ciornă se poate arunca. O factură emisă, nu.
create or replace function sales.discard_invoice_draft(invoice_id uuid)
    returns boolean
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
begin
    delete from sales.invoices i
    where i.id = discard_invoice_draft.invoice_id
      and i.status = 'draft';

    if not found then
        raise exception 'Doar o ciornă se poate șterge. O factură emisă o corectezi prin stornare.';
    end if;
    return true;
end;
$$;

-- „Emite factura”: numărul următor din seria activă, data de azi și datele firmei de azi
create or replace function sales.issue_invoice(invoice_id uuid)
    returns sales.invoices
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_invoice sales.invoices;
    v_shop    sales.shop_info;
    v_series  sales.invoice_series_counters;
begin
    select i.* into v_invoice
    from sales.invoices i
    where i.id = issue_invoice.invoice_id
    for update;

    if v_invoice.id is null then
        raise exception 'Factura nu există.';
    end if;
    if v_invoice.status = 'issued' then
        raise exception 'Factura % % e deja emisă.', v_invoice.series, v_invoice.number;
    end if;
    if not exists (select 1 from sales.invoice_lines l where l.invoice_id = v_invoice.id) then
        raise exception 'Factura nu are niciun rând.';
    end if;

    if v_invoice.kind = 'invoice' then
        if exists (select 1 from sales.orders o where o.id = v_invoice.order_id and o.status = 'cancelled') then
            raise exception 'Comanda a fost anulată: nu se mai facturează.';
        end if;
    elsif exists (
        select 1
        from sales.invoice_lines s
        join sales.invoice_lines original on original.id = s.storno_of_line
        where s.invoice_id = v_invoice.id
          and abs(s.quantity) > sales.invoice_lines_remaining_quantity(original)
    ) then
        raise exception 'Între timp, o parte din produse a fost deja stornată. Șterge ciorna și fă alta.';
    end if;

    select s.* into v_shop from sales.shop_info s where s.id;
    if v_shop.cui is null or v_shop.reg_com is null or v_shop.registered_office is null then
        raise exception 'Completează întâi datele firmei (CUI, nr. Registrul Comerțului, sediul social) la Administrare → Datele firmei.';
    end if;

    -- Rândul seriei rămâne blocat până la sfârșitul tranzacției: două facturi emise în aceeași
    -- clipă primesc numere diferite, iar dacă emiterea eșuează, numărul nu se pierde (fără goluri)
    select s.* into v_series
    from sales.invoice_series_counters s
    where s.is_active
    for update;

    if v_series.code is null then
        raise exception 'Nu există o serie activă pentru facturi.';
    end if;

    update sales.invoice_series_counters s
    set next_number = s.next_number + 1
    where s.code = v_series.code;

    update sales.invoices i
    set status         = 'issued',
        series         = v_series.code,
        number         = v_series.next_number,
        issue_date     = (now() at time zone 'Europe/Bucharest')::date,
        issued_at      = now(),
        issued_by      = nullif(current_setting('jwt.claims.user_id', true), '')::uuid,
        seller_name    = v_shop.legal_name,
        seller_cui     = v_shop.cui,
        seller_reg_com = v_shop.reg_com,
        seller_address = v_shop.registered_office
    where i.id = v_invoice.id
    returning * into v_invoice;

    return v_invoice;
end;
$$;

-- Stornarea: o ciornă nouă, cu minus. items = [{"line_id": "...", "quantity": 1}, ...];
-- fără items, se stornează tot ce n-a fost stornat încă.
create or replace function sales.create_storno_draft(invoice_id uuid, items jsonb default null)
    returns sales.invoices
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_original  sales.invoices;
    v_storno    sales.invoices;
    v_line      sales.invoice_lines;
    v_quantity  numeric;
    v_remaining numeric;
    v_count     integer := 0;
    v_before    record;
    v_gross     numeric;
    v_net       numeric;
begin
    select i.* into v_original
    from sales.invoices i
    where i.id = create_storno_draft.invoice_id
    for update;

    if v_original.id is null then
        raise exception 'Factura nu există.';
    end if;
    if v_original.status <> 'issued' then
        raise exception 'Doar o factură emisă se stornează. O ciornă o poți șterge.';
    end if;
    if v_original.kind = 'storno' then
        raise exception 'O factură de stornare nu se mai stornează.';
    end if;
    if exists (select 1 from sales.invoices s where s.storno_of = v_original.id and s.status = 'draft') then
        raise exception 'Există deja o ciornă de stornare pentru factura % %. Emite-o sau șterge-o întâi.',
            v_original.series, v_original.number;
    end if;
    if create_storno_draft.items is not null then
        if jsonb_typeof(create_storno_draft.items) <> 'array' then
            raise exception 'Lista de produse de stornat nu se potrivește cu factura.';
        end if;
        if exists (
            select 1
            from jsonb_array_elements(create_storno_draft.items) e
            where not exists (
                select 1 from sales.invoice_lines l
                where l.invoice_id = v_original.id and l.id::text = e ->> 'line_id'
            )
        ) then
            raise exception 'Lista de produse de stornat nu se potrivește cu factura.';
        end if;
    end if;

    insert into sales.invoices
        (kind, order_id, storno_of, buyer_name, buyer_cui, buyer_reg_com, buyer_address, buyer_email, payment_method)
    values ('storno', v_original.order_id, v_original.id, v_original.buyer_name, v_original.buyer_cui,
            v_original.buyer_reg_com, v_original.buyer_address, v_original.buyer_email, v_original.payment_method)
    returning * into v_storno;

    for v_line in
        select l.*
        from sales.invoice_lines l
        where l.invoice_id = v_original.id
        order by l.line_no
    loop
        v_remaining := sales.invoice_lines_remaining_quantity(v_line);

        if create_storno_draft.items is null then
            v_quantity := v_remaining;
        else
            select coalesce(sum((e ->> 'quantity')::numeric), 0) into v_quantity
            from jsonb_array_elements(create_storno_draft.items) e
            where e ->> 'line_id' = v_line.id::text;
        end if;

        if v_quantity < 0 or v_quantity <> trunc(v_quantity) then
            raise exception 'Cantitatea de stornat trebuie să fie un număr întreg.';
        end if;
        if v_quantity > v_remaining then
            raise exception 'Din „%” se mai pot storna cel mult %.', v_line.description, trim_scale(v_remaining);
        end if;
        continue when v_quantity = 0;

        v_count := v_count + 1;
        if v_quantity = v_remaining then
            -- Ultima parte din rând (sau tot rândul): exact ce a rămas nestornat, ca după stornare
            -- rândul să ajungă la zero, inclusiv baza și TVA-ul
            select coalesce(sum(s.gross), 0) as gross, coalesce(sum(s.net), 0) as net
            into v_before
            from sales.invoice_lines s
            join sales.invoices si on si.id = s.invoice_id
            where s.storno_of_line = v_line.id
              and si.status = 'issued';
            v_gross := -(v_line.gross + v_before.gross);
            v_net := -(v_line.net + v_before.net);
        else
            -- O parte din rând: valoarea cu TVA proporțională, apoi baza și TVA-ul din ea
            v_gross := -round(v_line.gross * v_quantity / abs(v_line.quantity), 2);
            v_net := round(v_gross / (1 + v_line.vat_rate / 100), 2);
        end if;

        insert into sales.invoice_lines (invoice_id, line_no, description, unit, quantity, unit_price_net,
                                         vat_rate, net, vat, gross, order_item_id, storno_of_line)
        values (v_storno.id, v_count, v_line.description, v_line.unit, -sign(v_line.quantity) * v_quantity,
                round(v_net / (-sign(v_line.quantity) * v_quantity), 4),
                v_line.vat_rate, v_net, v_gross - v_net, v_gross, v_line.order_item_id, v_line.id);
    end loop;

    if v_count = 0 then
        raise exception 'Nu e nimic de stornat: alege cel puțin un produs (sau factura e deja stornată în întregime).';
    end if;

    perform sales.update_invoice_totals(v_storno.id);

    select i.* into v_storno from sales.invoices i where i.id = v_storno.id;
    return v_storno;
end;
$$;

-- Seria: până la prima factură o poți schimba cum vrei (cod și număr de început).
-- După aceea numerotarea ei continuă singură; poți doar trece la o serie nouă, cu alt cod.
create or replace function sales.update_invoice_series(code text, next_number integer)
    returns sales.invoice_series_counters
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_active sales.invoice_series_counters;
    v_code   text := upper(btrim(coalesce(update_invoice_series.code, '')));
begin
    if v_code !~ '^[A-Z][A-Z0-9]{0,9}$' then
        raise exception 'Codul seriei: litere și cifre, fără spații, începe cu o literă (cel mult 10), de exemplu PGW.';
    end if;
    if update_invoice_series.next_number is null or update_invoice_series.next_number not between 1 and 999999999 then
        raise exception 'Numărul de început trebuie să fie între 1 și 999999999.';
    end if;

    select s.* into v_active
    from sales.invoice_series_counters s
    where s.is_active
    for update;

    if v_code <> coalesce(v_active.code, '') and exists (select 1 from sales.invoice_series_counters s where s.code = v_code) then
        raise exception 'Seria % a mai fost folosită. Alege alt cod.', v_code;
    end if;

    if v_active.code is not null and not exists (select 1 from sales.invoices i where i.series = v_active.code) then
        update sales.invoice_series_counters s
        set code        = v_code,
            next_number = update_invoice_series.next_number
        where s.code = v_active.code
        returning * into v_active;
        return v_active;
    end if;

    if v_code = v_active.code then
        raise exception 'Seria % are deja facturi, așa că numerotarea ei continuă singură. Pentru o serie nouă, scrie alt cod.',
            v_code;
    end if;

    update sales.invoice_series_counters s set is_active = false where s.code = v_active.code;
    insert into sales.invoice_series_counters (code, next_number)
    values (v_code, update_invoice_series.next_number)
    returning * into v_active;
    return v_active;
end;
$$;

-- ---------- 6. Legătura cu comenzile ----------

-- Comandă confirmată, cu livrare: ciorna facturii apare singură.
-- Comandă anulată: ciorna dispare (o factură deja emisă rămâne și se stornează din pagina ei).
create or replace function sales.invoice_on_order_status()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
begin
    if new.status is not distinct from old.status then
        return null;
    end if;

    if new.status = 'cancelled' then
        delete from sales.invoices i
        where i.order_id = new.id and i.kind = 'invoice' and i.status = 'draft';
    elsif new.status = 'confirmed'
          and exists (select 1 from sales.delivery_methods dm where dm.id = new.delivery_method_id and dm.needs_address) then
        begin
            perform sales.create_invoice_draft(new.id);
        exception when others then
            -- Facturarea nu are voie să încurce confirmarea comenzii: ciorna se poate face și de mână
            raise warning 'Ciorna facturii pentru comanda % nu s-a putut face: %', new.order_number, sqlerrm;
        end;
    end if;
    return null;
end;
$$;

drop trigger if exists orders_invoice_draft on sales.orders;
create trigger orders_invoice_draft
    after update of status on sales.orders
    for each row
    execute function sales.invoice_on_order_status();

-- ---------- 7. API și drepturi: doar adminul ----------

comment on table sales.invoice_series_counters is E'@omit create,update,delete';
comment on table sales.invoices is E'@omit create,update,delete';
comment on table sales.invoice_lines is E'@omit create,update,delete';
comment on function sales.is_valid_cui(text) is E'@omit';
comment on function sales.is_valid_cnp(text) is E'@omit';
comment on function sales.update_invoice_totals(uuid) is E'@omit';
comment on function sales.compute_invoice_amounts(uuid) is E'@omit';
comment on function sales.add_order_invoice_lines(uuid, sales.orders) is E'@omit';

grant select on sales.invoice_series_counters, sales.invoices, sales.invoice_lines to panos_admin;

grant execute on function sales.invoice_lines_remaining_quantity(sales.invoice_lines) to panos_admin;
grant execute on function sales.orders_can_invoice(sales.orders) to panos_admin;
grant execute on function sales.create_invoice_draft(uuid) to panos_admin;
grant execute on function sales.update_invoice_draft(uuid, text, text, text, text, text) to panos_admin;
grant execute on function sales.discard_invoice_draft(uuid) to panos_admin;
grant execute on function sales.issue_invoice(uuid) to panos_admin;
grant execute on function sales.create_storno_draft(uuid, jsonb) to panos_admin;
grant execute on function sales.update_invoice_series(text, integer) to panos_admin;

alter table sales.invoice_series_counters enable row level security;
alter table sales.invoices enable row level security;
alter table sales.invoice_lines enable row level security;

drop policy if exists invoice_series_admin on sales.invoice_series_counters;
create policy invoice_series_admin on sales.invoice_series_counters for select to panos_admin using (true);

drop policy if exists invoices_admin on sales.invoices;
create policy invoices_admin on sales.invoices for select to panos_admin using (true);

drop policy if exists invoice_lines_admin on sales.invoice_lines;
create policy invoice_lines_admin on sales.invoice_lines for select to panos_admin using (true);

commit;
