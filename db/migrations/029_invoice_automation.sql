-- 029: Facturile lucrează singure în cazurile clare, iar clientul le primește pe email.
--
--   1. Anulezi o comandă care are factura emisă (clientul a renunțat, coletul a fost refuzat
--      sau neplătit, comanda n-a fost ridicată): factura se stornează automat, în aceeași clipă.
--      Anularea e confirmarea ta, așa că nu mai trebuie apăsat nimic în plus.
--   2. La retur, când apeși „Am primit produsele” (sau direct „Am returnat banii”): se stornează
--      automat doar produsele returnate. Dacă s-a returnat tot, se stornează și livrarea, pe care
--      legea spune că o dai înapoi când clientul se retrage din toată comanda.
--   3. Orice factură emisă (și orice stornare) intră în coada poștașului: clientul o primește pe
--      email, ca PDF, iar tu o copie (pentru arhivă).
--
-- Se poate rula de mai multe ori.

begin;

-- ---------- 1. De ce a fost anulată comanda ----------

alter table sales.orders add column if not exists cancel_reason text;

alter table sales.orders drop constraint if exists orders_cancel_reason_check;
alter table sales.orders add constraint orders_cancel_reason_check
    check (cancel_reason in ('customer', 'refused', 'not_collected', 'shop', 'other'));

-- Motivul se scrie doar la anulare. Dacă nu vine din admin, îl deducem din starea de dinainte.
create or replace function sales.set_cancel_reason()
    returns trigger
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
begin
    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
        new.cancel_reason := coalesce(new.cancel_reason, case old.status
            when 'shipped' then 'refused'
            when 'ready_for_pickup' then 'not_collected'
            else 'other'
        end);
    else
        new.cancel_reason := old.cancel_reason; -- în rest nu se schimbă
    end if;
    return new;
end;
$$;

drop trigger if exists orders_cancel_reason on sales.orders;
create trigger orders_cancel_reason
    before update of status, cancel_reason on sales.orders
    for each row
    execute function sales.set_cancel_reason();

grant update (cancel_reason) on sales.orders to panos_admin;

-- ---------- 2. Stornarea legată de cererea de retur ----------

alter table sales.invoices add column if not exists withdrawal_id uuid references sales.withdrawals (id);
create index if not exists invoices_withdrawal_id_idx on sales.invoices (withdrawal_id);

-- ---------- 3. Stornările automate ----------

-- Stornează tot ce n-a fost stornat încă dintr-o factură și o emite pe loc.
-- O ciornă de stornare începută de mână se aruncă: stornarea automată o înlocuiește.
create or replace function sales.issue_storno(
    target     uuid,
    items      jsonb,
    note       text,
    withdrawal uuid default null
)
    returns sales.invoices
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_storno sales.invoices;
begin
    delete from sales.invoices i
    where i.storno_of = issue_storno.target and i.status = 'draft';

    v_storno := sales.create_storno_draft(issue_storno.target, issue_storno.items);

    update sales.invoices i
    set note          = left(issue_storno.note, 500),
        withdrawal_id = issue_storno.withdrawal
    where i.id = v_storno.id;

    return sales.issue_invoice(v_storno.id);
end;
$$;

-- Ce scrie pe stornare, la mențiuni, când se anulează comanda
create or replace function sales.cancel_note(o sales.orders)
    returns text
    language sql
    immutable
    set search_path = pg_catalog, pg_temp
as $$
    select 'Anularea comenzii #' || o.order_number || case o.cancel_reason
        when 'customer' then ', la cererea clientului.'
        when 'refused' then ': colet refuzat sau neplătit la livrare.'
        when 'not_collected' then ': comanda nu a fost ridicată din magazin.'
        when 'shop' then ': comanda nu a putut fi onorată.'
        else '.'
    end;
$$;

-- Comandă anulată: ciorna dispare, iar facturile emise se stornează pe loc.
-- Comandă confirmată, cu livrare: ciorna facturii apare singură (ca în 028).
-- Dacă stornarea nu reușește, nici anularea nu se salvează: nu rămâne o factură „uitată”.
create or replace function sales.invoice_on_order_status()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_invoice uuid;
begin
    if new.status is not distinct from old.status then
        return null;
    end if;

    if new.status = 'cancelled' then
        delete from sales.invoices i
        where i.order_id = new.id and i.kind = 'invoice' and i.status = 'draft';

        for v_invoice in
            select distinct i.id
            from sales.invoices i
            join sales.invoice_lines l on l.invoice_id = i.id
            where i.order_id = new.id
              and i.kind = 'invoice'
              and i.status = 'issued'
              and sales.invoice_lines_remaining_quantity(l) > 0
        loop
            perform sales.issue_storno(v_invoice, null, sales.cancel_note(new));
        end loop;
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

-- Retur: stornează produsele returnate de pe factura activă a comenzii (cea care mai are
-- ceva nestornat). Dacă după asta nu mai rămâne niciun produs, se stornează și livrarea.
create or replace function sales.storno_withdrawal(target uuid)
    returns sales.invoices
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_withdrawal sales.withdrawals;
    v_invoice    uuid;
    v_items      jsonb := '[]'::jsonb;
    v_item       record;
    v_goods_left numeric;
    v_returned   numeric := 0;
    v_charge     record;
begin
    select w.* into v_withdrawal from sales.withdrawals w where w.id = storno_withdrawal.target;
    if v_withdrawal.id is null then
        return null;
    end if;
    if exists (select 1 from sales.invoices i where i.withdrawal_id = v_withdrawal.id and i.status = 'issued') then
        return null; -- stornarea pentru retur s-a făcut deja
    end if;

    select i.id into v_invoice
    from sales.invoices i
    where i.order_id = v_withdrawal.order_id
      and i.kind = 'invoice'
      and i.status = 'issued'
      and exists (
          select 1 from sales.invoice_lines l
          where l.invoice_id = i.id and sales.invoice_lines_remaining_quantity(l) > 0
      )
    order by i.issued_at desc
    limit 1;

    if v_invoice is null then
        return null; -- comanda n-a avut factură (de exemplu, bon fiscal la magazin) sau e deja stornată
    end if;

    -- Produsele returnate, cât se mai poate storna din fiecare
    for v_item in
        select l.id as line_id,
               least(wi.quantity, sales.invoice_lines_remaining_quantity(l)) as quantity
        from sales.withdrawal_items wi
        join sales.invoice_lines l on l.invoice_id = v_invoice and l.order_item_id = wi.order_item_id
        where wi.withdrawal_id = v_withdrawal.id
    loop
        continue when v_item.quantity <= 0;
        v_items := v_items || jsonb_build_object('line_id', v_item.line_id, 'quantity', v_item.quantity);
        v_returned := v_returned + v_item.quantity;
    end loop;

    if v_returned = 0 then
        return null;
    end if;

    -- Mai rămân produse nestornate pe factură după returul ăsta?
    select coalesce(sum(sales.invoice_lines_remaining_quantity(l)), 0) - v_returned
    into v_goods_left
    from sales.invoice_lines l
    where l.invoice_id = v_invoice and l.order_item_id is not null;

    -- Nu: s-a returnat tot, deci se stornează și livrarea (și taxa de plată, reducerea)
    if v_goods_left = 0 then
        for v_charge in
            select l.id as line_id, sales.invoice_lines_remaining_quantity(l) as quantity
            from sales.invoice_lines l
            where l.invoice_id = v_invoice and l.order_item_id is null
        loop
            continue when v_charge.quantity <= 0;
            v_items := v_items || jsonb_build_object('line_id', v_charge.line_id, 'quantity', v_charge.quantity);
        end loop;
    end if;

    return sales.issue_storno(
        v_invoice,
        v_items,
        'Retur conform cererii din ' || to_char(v_withdrawal.created_at at time zone 'Europe/Bucharest', 'DD.MM.YYYY')
            || ' (comanda #' || (select o.order_number from sales.orders o where o.id = v_withdrawal.order_id) || ').',
        v_withdrawal.id
    );
end;
$$;

create or replace function sales.invoice_on_withdrawal_status()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
begin
    if new.status is distinct from old.status and new.status in ('goods_received', 'refunded') then
        perform sales.storno_withdrawal(new.id);
    end if;
    return null;
end;
$$;

drop trigger if exists withdrawals_invoice_storno on sales.withdrawals;
create trigger withdrawals_invoice_storno
    after update of status on sales.withdrawals
    for each row
    execute function sales.invoice_on_withdrawal_status();

-- ---------- 4. Facturile pe email ----------

-- Coada: o factură emisă = un rând; poștașul o trimite ca PDF și pune ștampila „trimisă”
create table if not exists sales.invoice_emails (
    invoice_id   uuid primary key references sales.invoices (id),
    email        text not null,
    created_at   timestamptz not null default now(),
    sent_at      timestamptz,
    attempts     integer not null default 0,
    last_error   text,
    locked_until timestamptz
);

create or replace function sales.queue_invoice_email()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
begin
    if new.buyer_email is not null then
        insert into sales.invoice_emails (invoice_id, email)
        values (new.id, new.buyer_email)
        on conflict (invoice_id) do nothing;
    end if;
    return null;
end;
$$;

drop trigger if exists invoices_queue_email on sales.invoices;
create trigger invoices_queue_email
    after update of status on sales.invoices
    for each row
    when (old.status = 'draft' and new.status = 'issued')
    execute function sales.queue_invoice_email();

-- „Trimite din nou”, din admin (de exemplu, după ce clientul și-a corectat adresa în cont)
create or replace function sales.resend_invoice_email(invoice_id uuid)
    returns boolean
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_invoice sales.invoices;
begin
    select i.* into v_invoice from sales.invoices i where i.id = resend_invoice_email.invoice_id;
    if v_invoice.id is null or v_invoice.status <> 'issued' then
        raise exception 'Doar o factură emisă se trimite pe email.';
    end if;
    if v_invoice.buyer_email is null then
        raise exception 'Factura nu are adresa de email a clientului.';
    end if;

    insert into sales.invoice_emails (invoice_id, email)
    values (v_invoice.id, v_invoice.buyer_email)
    on conflict on constraint invoice_emails_pkey do update
        set email = excluded.email, sent_at = null, attempts = 0, last_error = null, locked_until = null,
            created_at = now();
    return true;
end;
$$;

-- Pentru admin: unde și când a plecat factura (sau de ce nu a plecat)
create or replace function sales.invoices_email_delivery(i sales.invoices)
    returns jsonb
    language sql
    stable
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    select jsonb_build_object(
        'email', e.email,
        'sentAt', e.sent_at,
        'attempts', e.attempts,
        'lastError', e.last_error
    )
    from sales.invoice_emails e
    where e.invoice_id = i.id;
$$;

-- Poștașul: ia facturile de trimis și le rezervă 2 minute, cu tot ce trebuie pentru PDF.
-- Întâi „drop”: dacă migrația 030 a ajuns deja în baza de date (de exemplu, rulată de mână),
-- funcția are acolo alt rezultat (+ PDF-ul) și „create or replace” nu i-l poate schimba.
-- 030, care vine imediat după, o face la loc în forma ei.
drop function if exists mailer.claim_invoice_emails(integer);
create function mailer.claim_invoice_emails(batch_size integer default 10)
    returns table (invoice_id uuid, attempts integer, data jsonb)
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    with picked as (
        select e.invoice_id
        from sales.invoice_emails e
        where e.sent_at is null
          and e.attempts < 8
          and (e.locked_until is null or e.locked_until < now())
        order by e.created_at
        limit batch_size
        for update skip locked
    ),
    claimed as (
        update sales.invoice_emails e
        set locked_until = now() + interval '2 minutes'
        from picked
        where e.invoice_id = picked.invoice_id
        returning e.*
    )
    select c.invoice_id,
           c.attempts,
           jsonb_build_object(
               'email', c.email,
               'invoice', to_jsonb(i) - 'issued_by',
               'lines', (select coalesce(jsonb_agg(to_jsonb(l) order by l.line_no), '[]'::jsonb)
                         from sales.invoice_lines l where l.invoice_id = i.id),
               'original', (select jsonb_build_object('series', s.series, 'number', s.number, 'issue_date', s.issue_date)
                            from sales.invoices s where s.id = i.storno_of),
               'order', jsonb_build_object('id', o.id, 'order_number', o.order_number, 'first_name', o.first_name),
               'shop', (select to_jsonb(s) - 'id' - 'updated_at' from sales.shop_info s where s.id)
           )
    from claimed c
    join sales.invoices i on i.id = c.invoice_id
    join sales.orders o on o.id = i.order_id
    order by c.created_at;
$$;

create or replace function mailer.complete_invoice_email(invoice_id uuid)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    update sales.invoice_emails e
    set sent_at = now(), locked_until = null, last_error = null
    where e.invoice_id = complete_invoice_email.invoice_id;
$$;

-- N-a mers: notăm eroarea și amânăm (1, 2, 3... minute); după 8 încercări se oprește
create or replace function mailer.fail_invoice_email(invoice_id uuid, error_message text)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    update sales.invoice_emails e
    set attempts     = e.attempts + 1,
        last_error   = left(fail_invoice_email.error_message, 500),
        locked_until = now() + make_interval(mins => e.attempts + 1)
    where e.invoice_id = fail_invoice_email.invoice_id;
$$;

-- ---------- 5. API și drepturi ----------

comment on table sales.invoice_emails is E'@omit';
comment on function sales.issue_storno(uuid, jsonb, text, uuid) is E'@omit';
comment on function sales.cancel_note(sales.orders) is E'@omit';
comment on function sales.storno_withdrawal(uuid) is E'@omit';

alter table sales.invoice_emails enable row level security; -- nimeni din API nu o citește direct

grant execute on function sales.resend_invoice_email(uuid) to panos_admin;
grant execute on function sales.invoices_email_delivery(sales.invoices) to panos_admin;

grant execute on function mailer.claim_invoice_emails(integer) to panos_mailer;
grant execute on function mailer.complete_invoice_email(uuid) to panos_mailer;
grant execute on function mailer.fail_invoice_email(uuid, text) to panos_mailer;

commit;
