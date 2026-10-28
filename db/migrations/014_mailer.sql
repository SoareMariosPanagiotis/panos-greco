-- 014_mailer.sql
-- Poștașul (programul mailer): coada de emailuri, cu reîncercări

-- 1) Pentru reîncercări: de câte ori am încercat, ce eroare am primit
--    și până când e „rezervat” un mail de o tură a poștașului
alter table sales.order_status_history
    add column attempts     integer not null default 0,
    add column last_error   text,
    add column locked_until timestamptz;

-- 2) Schemă privată: PostGraphile nu o publică, deci nu ajunge în API
create schema mailer;

-- 3) Rolul poștașului: se poate conecta, dar nu vede niciun tabel.
--    Poate doar să apeleze cele 3 funcții de mai jos.
--    Parola o setezi separat, din consolă (nu stă în Git).
create role panos_mailer login;
grant usage on schema mailer to panos_mailer;

-- Ia până la batch_size mailuri de trimis și le rezervă 2 minute,
-- ca o altă tură să nu le trimită de două ori
create function mailer.claim_notifications(batch_size integer default 10)
    returns table (history_id uuid, status text, attempts integer, order_data jsonb)
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    with picked as (
        select h.id
        from sales.order_status_history h
        where h.notified_at is null
          and h.attempts < 8
          and (h.locked_until is null or h.locked_until < now())
        order by h.created_at
        limit batch_size
        for update skip locked
    ),
    claimed as (
        update sales.order_status_history h
        set locked_until = now() + interval '2 minutes'
        from picked
        where h.id = picked.id
        returning h.id, h.order_id, h.status, h.attempts, h.created_at
    )
-- Comanda întreagă, ca JSON, cu produsele ei în câmpul "items"
select c.id,
       c.status,
       c.attempts,
       to_jsonb(o) || jsonb_build_object(
               'items',
               (select coalesce(jsonb_agg(to_jsonb(i) order by i.product_name, i.size_label), '[]'::jsonb)
                from sales.order_items i
                where i.order_id = o.id)
                      )
from claimed c
         join sales.orders o on o.id = c.order_id
order by c.created_at;
$$;

-- Mailul a plecat: punem ștampila „trimis”
create function mailer.complete_notification(history_id uuid)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
update sales.order_status_history
set notified_at = now(), locked_until = null, last_error = null
where id = history_id;
$$;

-- N-a mers: notăm eroarea și amânăm încercarea următoare (1, 2, 3... minute)
create function mailer.fail_notification(history_id uuid, error_message text)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
update sales.order_status_history
set attempts     = attempts + 1,
    last_error   = left(error_message, 500),
    locked_until = now() + make_interval(mins => attempts + 1)
where id = history_id;
$$;

grant execute on function mailer.claim_notifications(integer) to panos_mailer;
grant execute on function mailer.complete_notification(uuid) to panos_mailer;
grant execute on function mailer.fail_notification(uuid, text) to panos_mailer;