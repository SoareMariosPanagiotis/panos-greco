-- 024: Retragerea din contract, online (OUG 34/2014, modificată de OUG 18/2026; se aplică din 19 iunie 2026).
--
-- Cum merge:
--   1. clientul apasă „Retrageți-vă din contract aici” (în subsol, în cont sau în mail)
--   2. își confirmă numele, alege produsele, lasă un email și apasă „Confirmați retragerea”
--   3. salvăm declarația exact cum a trimis-o, cu data și ora: asta e dovada
--   4. poștașul îi trimite confirmarea de primire pe email, iar ție o notificare
--
-- Termenul: 14 zile de la primirea coletului. Dacă a 14-a zi pică sâmbătă, duminică
-- sau într-o sărbătoare legală, termenul se mută pe următoarea zi lucrătoare.
-- Până la livrare, clientul se poate retrage oricând.
--
-- Se poate rula de mai multe ori.

begin;

-- ---------- 1. Calendarul: sărbători legale și ultima zi a termenului ----------

-- Paștele ortodox: algoritmul lui Meeus (calendarul iulian) + 13 zile. Corect între 1900 și 2099.
create or replace function sales.orthodox_easter(year integer)
    returns date
    language sql
    immutable
    strict
    set search_path = pg_catalog, pg_temp
as $$
    with t as (
        select year % 4 as a,
               year % 7 as b,
               (19 * (year % 19) + 15) % 30 as d
    ), u as (
        select d, (2 * a + 4 * b - d + 34) % 7 as e from t
    )
    select make_date(year, (d + e + 114) / 31, (d + e + 114) % 31 + 1) + 13
    from u;
$$;

-- Sărbătorile legale din România (Codul muncii, art. 139): cele cu dată fixă
-- și cele legate de Paște (Vinerea Mare, Paștele, Rusaliile)
create or replace function sales.is_public_holiday(day date)
    returns boolean
    language sql
    immutable
    strict
    set search_path = pg_catalog, pg_temp
as $$
    select (extract(month from day)::integer * 100 + extract(day from day)::integer)
               in (101, 102, 106, 107, 124, 501, 601, 815, 1130, 1201, 1225, 1226)
        or day - sales.orthodox_easter(extract(year from day)::integer) in (-2, 0, 1, 49, 50);
$$;

-- Ultima zi în care clientul se mai poate retrage, dacă a primit coletul în ziua „delivered_on”
create or replace function sales.withdrawal_last_day(delivered_on date)
    returns date
    language plpgsql
    immutable
    strict
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_day date := delivered_on + 14;
begin
    -- isodow: 6 = sâmbătă, 7 = duminică
    while extract(isodow from v_day) in (6, 7) or sales.is_public_holiday(v_day) loop
        v_day := v_day + 1;
    end loop;
    return v_day;
end;
$$;

-- IBAN-ul are o cifră de control: mutăm primele 4 caractere la coadă, transformăm literele
-- în numere (A = 10 ... Z = 35), iar restul împărțirii la 97 trebuie să fie 1.
-- Așa prindem aproape orice greșeală de tastare.
create or replace function sales.iban_is_valid(iban text)
    returns boolean
    language plpgsql
    immutable
    strict
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_moved  text := substr(iban, 5) || substr(iban, 1, 4);
    v_digits text := '';
    v_char   text;
    v_rest   integer := 0;
begin
    if iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then
        return false;
    end if;
    foreach v_char in array regexp_split_to_array(v_moved, '') loop
        v_digits := v_digits || case when v_char ~ '[A-Z]' then (ascii(v_char) - 55)::text else v_char end;
    end loop;
    -- Numărul e prea mare pentru orice tip întreg, așa că împărțim cifră cu cifră
    foreach v_char in array regexp_split_to_array(v_digits, '') loop
        v_rest := (v_rest * 10 + v_char::integer) % 97;
    end loop;
    return v_rest = 1;
end;
$$;

-- Unelte interne: nu le punem în API
comment on function sales.orthodox_easter(integer) is E'@omit';
comment on function sales.is_public_holiday(date) is E'@omit';
comment on function sales.withdrawal_last_day(date) is E'@omit';
comment on function sales.iban_is_valid(text) is E'@omit';

-- ---------- 2. Cererile de retragere ----------

create table if not exists sales.withdrawals (
    id            uuid primary key default gen_random_uuid(),
    order_id      uuid not null references sales.orders (id),
    customer_name text not null check (char_length(customer_name) between 2 and 100),
    -- Adresa la care trimitem confirmarea (o alege clientul; de obicei cea din comandă)
    email         text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    reason        text check (char_length(reason) <= 1000),          -- opțional: legea nu cere motiv
    -- Opțional, pentru comenzile plătite ramburs: contul în care returnăm banii.
    -- Se șterge singur după ce banii au fost returnați (vezi trigger-ul de mai jos).
    iban          text check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
    statement     text not null,                                     -- declarația, exact cum a trimis-o clientul
    status        text not null default 'received'
                  check (status in ('received', 'goods_received', 'refunded', 'closed')),
    admin_note    text check (char_length(admin_note) <= 1000),
    created_at    timestamptz not null default now(),                -- data și ora trimiterii: apar în confirmare
    updated_at    timestamptz not null default now(),
    -- Pentru poștaș: aceeași rețetă ca la mailurile comenzilor
    notified_at   timestamptz,
    attempts      integer not null default 0,
    last_error    text,
    locked_until  timestamptz
);

-- Ce produse (și câte bucăți) returnează clientul
create table if not exists sales.withdrawal_items (
    withdrawal_id uuid not null references sales.withdrawals (id) on delete cascade,
    order_item_id uuid not null references sales.order_items (id),
    quantity      integer not null check (quantity > 0),
    primary key (withdrawal_id, order_item_id)
);

create index if not exists withdrawals_order_idx on sales.withdrawals (order_id);
create index if not exists withdrawal_items_item_idx on sales.withdrawal_items (order_item_id);
-- Doar confirmările netrimise: poștașul le găsește instant
create index if not exists withdrawals_pending_idx on sales.withdrawals (created_at)
    where notified_at is null;

-- Pașii unei cereri, din admin: primită → produse primite → bani returnați (sau închisă).
-- La final, IBAN-ul nu mai e necesar: îl ștergem, ca să nu păstrăm date de care nu avem nevoie.
create or replace function sales.check_withdrawal_status()
    returns trigger
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
begin
    if new.status is distinct from old.status then
        if old.status in ('refunded', 'closed') then
            raise exception 'Cererea de retragere e deja încheiată.';
        end if;
        if not (
               (old.status = 'received'       and new.status in ('goods_received', 'refunded', 'closed'))
            or (old.status = 'goods_received' and new.status in ('refunded', 'closed'))
        ) then
            raise exception 'Pasul ales nu se potrivește cu starea cererii.';
        end if;
    end if;

    if new.status in ('refunded', 'closed') then
        new.iban := null;
    end if;
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists withdrawals_check_status on sales.withdrawals;
create trigger withdrawals_check_status
    before update on sales.withdrawals
    for each row execute function sales.check_withdrawal_status();

-- ---------- 3. Câmpuri calculate pe comandă ----------
-- O funcție sales.orders_xxx(o sales.orders) apare în GraphQL ca un câmp al comenzii: order.xxx

-- Până când se poate retrage clientul (sfârșitul ultimei zile, ora României).
-- Null cât timp comanda nu e livrată: până atunci se poate retrage oricând.
create or replace function sales.orders_withdrawal_deadline(o sales.orders)
    returns timestamptz
    language sql
    stable
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    select (sales.withdrawal_last_day((max(h.created_at) at time zone 'Europe/Bucharest')::date) + 1)::timestamp
               at time zone 'Europe/Bucharest'
    from sales.order_status_history h
    where h.order_id = o.id
      and h.status = 'delivered';
$$;

-- Mai poate apăsa clientul butonul? Nu, dacă: comanda e anulată, termenul a trecut
-- sau a cerut deja retragerea pentru toate produsele.
create or replace function sales.orders_can_withdraw(o sales.orders)
    returns boolean
    language sql
    stable
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    select o.status <> 'cancelled'
       and coalesce(sales.orders_withdrawal_deadline(o) > now(), true)
       and exists (
           select 1
           from sales.order_items i
           where i.order_id = o.id
             and i.quantity > coalesce((select sum(wi.quantity)
                                        from sales.withdrawal_items wi
                                        where wi.order_item_id = i.id), 0)
       );
$$;

-- ---------- 4. Ușile din site ----------

-- Clientul fără cont își găsește comanda după număr și emailul folosit la comandă.
-- Întoarce id-ul lung (uuid) al comenzii, sau nimic dacă nu se potrivesc.
create or replace function sales.find_order_for_withdrawal(order_number integer, email text)
    returns uuid
    language sql
    stable
    strict
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    select o.id
    from sales.orders o
    where o.order_number = find_order_for_withdrawal.order_number
      and lower(o.email) = lower(btrim(find_order_for_withdrawal.email));
$$;

-- Tot ce îi trebuie paginii de retragere, după id-ul lung al comenzii (din cont, din mail
-- sau găsit mai sus). După termen nu mai trimitem datele personale, doar motivul.
create or replace function sales.withdrawal_form(order_id uuid)
    returns jsonb
    language plpgsql
    stable
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_order    sales.orders;
    v_deadline timestamptz;
    v_requests jsonb;
begin
    select o.* into v_order from sales.orders o where o.id = withdrawal_form.order_id;
    if v_order.id is null then
        return null;
    end if;

    v_deadline := sales.orders_withdrawal_deadline(v_order);

    select coalesce(jsonb_agg(jsonb_build_object('createdAt', w.created_at, 'status', w.status)
                              order by w.created_at), '[]'::jsonb)
    into v_requests
    from sales.withdrawals w
    where w.order_id = v_order.id;

    if not sales.orders_can_withdraw(v_order) then
        return jsonb_build_object(
            'orderNumber', v_order.order_number,
            'canWithdraw', false,
            'reason', case
                          when v_order.status = 'cancelled' then 'cancelled'
                          when v_deadline is not null and v_deadline <= now() then 'expired'
                          else 'complete'
                      end,
            'deadline', v_deadline,
            'requests', v_requests
        );
    end if;

    return jsonb_build_object(
        'orderId', v_order.id,
        'orderNumber', v_order.order_number,
        'canWithdraw', true,
        'status', v_order.status,
        'createdAt', v_order.created_at,
        'deadline', v_deadline,
        'customerName', v_order.customer_name,
        'email', v_order.email,
        'paidOnDelivery', exists (select 1 from sales.payment_methods pm
                                  where pm.id = v_order.payment_method_id and pm.code = 'cash_on_delivery'),
        'items', (select jsonb_agg(jsonb_build_object(
                             'id', i.id,
                             'productName', i.product_name,
                             'sizeLabel', i.size_label,
                             'quantity', i.quantity,
                             'remaining', i.quantity - coalesce((select sum(wi.quantity)
                                                                 from sales.withdrawal_items wi
                                                                 where wi.order_item_id = i.id), 0))
                         order by i.product_name, i.size_label)
                  from sales.order_items i
                  where i.order_id = v_order.id),
        'requests', v_requests
    );
end;
$$;

-- Butonul „Confirmați retragerea”. items = [{"order_item_id": "...", "quantity": 1}, ...]
create or replace function sales.request_withdrawal(
    order_id      uuid,
    customer_name text,
    email         text,
    items         jsonb,
    reason        text default null,
    iban          text default null
)
    returns jsonb
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_order     sales.orders;
    v_name      text := btrim(coalesce(request_withdrawal.customer_name, ''));
    v_email     text := lower(btrim(coalesce(request_withdrawal.email, '')));
    v_reason    text := nullif(btrim(coalesce(request_withdrawal.reason, '')), '');
    v_iban      text := nullif(upper(regexp_replace(coalesce(request_withdrawal.iban, ''), '\s', '', 'g')), '');
    v_deadline  timestamptz;
    v_delivered timestamptz;
    v_bad       integer;
    v_list      text;
    v_statement text;
    v_id        uuid;
    v_created   timestamptz;
begin
    -- „for update”: două cereri trimise în aceeași clipă pentru aceeași comandă așteaptă una după alta
    select o.* into v_order from sales.orders o where o.id = request_withdrawal.order_id for update;
    if v_order.id is null then
        raise exception 'Nu am găsit comanda.';
    end if;

    v_deadline := sales.orders_withdrawal_deadline(v_order);
    if v_order.status = 'cancelled' then
        raise exception 'Comanda a fost anulată, deci nu mai e nimic de returnat.';
    end if;
    if v_deadline is not null and v_deadline <= now() then
        raise exception 'Termenul de retragere pentru această comandă s-a încheiat.';
    end if;

    if char_length(v_name) not between 2 and 100 then
        raise exception 'Scrie numele și prenumele.';
    end if;
    if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'Scrie o adresă de email validă, ca să îți putem trimite confirmarea.';
    end if;
    if char_length(v_reason) > 1000 then
        raise exception 'Motivul e prea lung (cel mult 1000 de caractere).';
    end if;
    if v_iban is not null and not sales.iban_is_valid(v_iban) then
        raise exception 'IBAN-ul nu pare corect. Verifică-l sau lasă câmpul gol.';
    end if;
    -- Două verificări separate: lungimea se poate citi doar dintr-o listă
    if jsonb_typeof(request_withdrawal.items) is distinct from 'array' then
        raise exception 'Alege cel puțin un produs.';
    end if;
    if jsonb_array_length(request_withdrawal.items) = 0 then
        raise exception 'Alege cel puțin un produs.';
    end if;

    -- Fiecare produs ales trebuie să fie din comanda asta, cu cel mult câte bucăți au mai rămas
    with wanted as (
        select x.order_item_id, sum(x.quantity) as quantity
        from jsonb_to_recordset(request_withdrawal.items) as x(order_item_id uuid, quantity integer)
        group by x.order_item_id
    ),
    available as (
        select i.id,
               i.quantity - coalesce((select sum(wi.quantity)
                                      from sales.withdrawal_items wi
                                      where wi.order_item_id = i.id), 0) as remaining
        from sales.order_items i
        where i.order_id = v_order.id
    )
    select count(*) filter (where a.id is null or w.quantity is null or w.quantity < 1 or w.quantity > a.remaining)
    into v_bad
    from wanted w
    left join available a on a.id = w.order_item_id;

    if v_bad > 0 then
        raise exception 'Produsele alese nu se potrivesc cu comanda. Reîncarcă pagina și încearcă din nou.';
    end if;

    -- Declarația, după modelul de formular din anexa la OUG 34/2014
    select string_agg(format('%s × %s (%s)', w.quantity, i.product_name, i.size_label), '; '
                      order by i.product_name, i.size_label)
    into v_list
    from (select x.order_item_id, sum(x.quantity) as quantity
          from jsonb_to_recordset(request_withdrawal.items) as x(order_item_id uuid, quantity integer)
          group by x.order_item_id) w
    join sales.order_items i on i.id = w.order_item_id;

    select max(h.created_at) into v_delivered
    from sales.order_status_history h
    where h.order_id = v_order.id
      and h.status = 'delivered';

    v_statement := format(
        'Prin prezenta vă informez cu privire la retragerea mea din contractul referitor la vânzarea următoarelor produse: %s. Comanda #%s, plasată pe %s%s. Numele consumatorului: %s.',
        v_list,
        v_order.order_number,
        to_char(v_order.created_at at time zone 'Europe/Bucharest', 'DD.MM.YYYY'),
        case
            when v_delivered is null then ''
            else ', primită pe ' || to_char(v_delivered at time zone 'Europe/Bucharest', 'DD.MM.YYYY')
        end,
        v_name
    );

    insert into sales.withdrawals (order_id, customer_name, email, reason, iban, statement)
    values (v_order.id, v_name, v_email, v_reason, v_iban, v_statement)
    returning id, created_at into v_id, v_created;

    insert into sales.withdrawal_items (withdrawal_id, order_item_id, quantity)
    select v_id, x.order_item_id, sum(x.quantity)
    from jsonb_to_recordset(request_withdrawal.items) as x(order_item_id uuid, quantity integer)
    group by x.order_item_id;

    return jsonb_build_object(
        'id', v_id,
        'createdAt', v_created,
        'email', v_email,
        'statement', v_statement
    );
end;
$$;

-- Rezultatul mutației se numește „withdrawal” în GraphQL
comment on function sales.request_withdrawal(uuid, text, text, jsonb, text, text) is E'@resultFieldName withdrawal';

-- ---------- 5. API: ce se vede și ce nu ----------

comment on table sales.withdrawals is E'@omit create,delete';
comment on table sales.withdrawal_items is E'@omit create,update,delete';
-- Coloanele poștașului nu au ce căuta în API
comment on column sales.withdrawals.notified_at is E'@omit';
comment on column sales.withdrawals.attempts is E'@omit';
comment on column sales.withdrawals.last_error is E'@omit';
comment on column sales.withdrawals.locked_until is E'@omit';

-- ---------- 6. Poștașul ----------

-- Ia până la batch_size confirmări de trimis, cu tot ce trebuie în mail, și le rezervă 2 minute
create or replace function mailer.claim_withdrawal_emails(batch_size integer default 10)
    returns table (withdrawal_id uuid, attempts integer, data jsonb)
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    with picked as (
        select w.id
        from sales.withdrawals w
        where w.notified_at is null
          and w.attempts < 8
          and (w.locked_until is null or w.locked_until < now())
        order by w.created_at
        limit batch_size
        for update skip locked
    ),
    claimed as (
        update sales.withdrawals w
        set locked_until = now() + interval '2 minutes'
        from picked
        where w.id = picked.id
        returning w.*
    )
    select c.id,
           c.attempts,
           jsonb_build_object(
               'id', c.id,
               'customer_name', c.customer_name,
               'email', c.email,
               'reason', c.reason,
               'has_iban', c.iban is not null,  -- IBAN-ul nu pleacă pe mail, doar dacă există
               'statement', c.statement,
               'created_at', c.created_at,
               'order', jsonb_build_object(
                   'id', o.id,
                   'order_number', o.order_number,
                   'first_name', o.first_name,
                   'status', o.status,
                   'paid_on_delivery', pm.code = 'cash_on_delivery'
               ),
               'items', (select coalesce(jsonb_agg(jsonb_build_object(
                                    'product_name', i.product_name,
                                    'size_label', i.size_label,
                                    'quantity', wi.quantity,
                                    'unit_price', i.unit_price)
                                order by i.product_name, i.size_label), '[]'::jsonb)
                         from sales.withdrawal_items wi
                         join sales.order_items i on i.id = wi.order_item_id
                         where wi.withdrawal_id = c.id),
               'shop', (select to_jsonb(s) - 'id' - 'updated_at' from sales.shop_info s where s.id)
           )
    from claimed c
    join sales.orders o on o.id = c.order_id
    join sales.payment_methods pm on pm.id = o.payment_method_id
    order by c.created_at;
$$;

-- Mailurile au plecat: punem ștampila „trimis”
create or replace function mailer.complete_withdrawal_email(withdrawal_id uuid)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    update sales.withdrawals w
    set notified_at = now(), locked_until = null, last_error = null
    where w.id = complete_withdrawal_email.withdrawal_id;
$$;

-- N-a mers: notăm eroarea și reîncercăm peste 1, 2, 3... minute
create or replace function mailer.fail_withdrawal_email(withdrawal_id uuid, error_message text)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    update sales.withdrawals w
    set attempts     = w.attempts + 1,
        last_error   = left(fail_withdrawal_email.error_message, 500),
        locked_until = now() + make_interval(mins => w.attempts + 1)
    where w.id = fail_withdrawal_email.withdrawal_id;
$$;

-- ---------- 7. Cine ce are voie ----------

-- Oricine are linkul comenzii (sau numărul + emailul ei) poate folosi butonul: fără cont
grant execute on function sales.orders_withdrawal_deadline(sales.orders) to panos_anonymous;
grant execute on function sales.orders_can_withdraw(sales.orders) to panos_anonymous;
grant execute on function sales.find_order_for_withdrawal(integer, text) to panos_anonymous;
grant execute on function sales.withdrawal_form(uuid) to panos_anonymous;
grant execute on function sales.request_withdrawal(uuid, text, text, jsonb, text, text) to panos_anonymous;

-- Clientul își vede cererile (RLS de mai jos alege care), fără IBAN și fără nota ta
grant select (id, order_id, customer_name, email, reason, statement, status, created_at, updated_at)
    on sales.withdrawals to panos_customer;
grant select on sales.withdrawal_items to panos_customer;
-- Adminul vede tot și poate schimba doar pasul și nota
grant select on sales.withdrawals to panos_admin;
grant update (status, admin_note) on sales.withdrawals to panos_admin;

grant execute on function mailer.claim_withdrawal_emails(integer) to panos_mailer;
grant execute on function mailer.complete_withdrawal_email(uuid) to panos_mailer;
grant execute on function mailer.fail_withdrawal_email(uuid, text) to panos_mailer;

-- ---------- 8. Row Level Security ----------

alter table sales.withdrawals enable row level security;

-- Clientul vede cererile pentru comenzile lui: subinterogarea respectă politicile comenzilor
drop policy if exists withdrawals_own on sales.withdrawals;
create policy withdrawals_own on sales.withdrawals
    for select to panos_customer
    using (exists (select 1 from sales.orders o where o.id = withdrawals.order_id));

drop policy if exists withdrawals_admin on sales.withdrawals;
create policy withdrawals_admin on sales.withdrawals
    for all to panos_admin using (true) with check (true);

alter table sales.withdrawal_items enable row level security;

drop policy if exists withdrawal_items_read on sales.withdrawal_items;
create policy withdrawal_items_read on sales.withdrawal_items
    for select to panos_customer
    using (exists (select 1 from sales.withdrawals w where w.id = withdrawal_items.withdrawal_id));

commit;
