-- 031: Clientul își anulează singur comanda, cât timp n-a plecat spre el (ca la eMAG).
--
-- Regulile:
--   - comandă nouă sau confirmată, fără AWB: clientul o poate anula din pagina comenzii
--     (linkul din mail sau „Contul meu”). La ridicarea din magazin: până o ridică;
--   - după ce ai pus AWB-ul / ai marcat-o „Expediată”: nu se mai poate anula. Clientul poate
--     refuza coletul la livrare sau îl poate returna în 14 zile după ce îl primește;
--   - după livrare: returul, cu formularul de retur (migrația 024).
--
-- Anularea făcută de client e tot o retragere din contract (OUG 34/2014, modificată de OUG 18/2026),
-- doar că înainte de livrare. De aceea: are pas de confirmare, o notăm cu data și ora, iar clientul
-- primește confirmarea pe email. Restul merge singur, ca la anularea din admin: stocul revine,
-- factura se stornează (029), iar tu primești un mail „Clientul a anulat comanda”.
--
-- Se poate rula de mai multe ori.

begin;

-- ---------- 1. Cine a anulat, când și de ce ----------

-- 'customer' = clientul, din site; 'shop' = tu, din admin. Gol la comenzile anulate înainte de 031.
alter table sales.orders add column if not exists cancelled_by text;
alter table sales.orders drop constraint if exists orders_cancelled_by_check;
alter table sales.orders add constraint orders_cancelled_by_check check (cancelled_by in ('customer', 'shop'));

alter table sales.orders add column if not exists cancelled_at timestamptz;

-- Motivul ales de client (opțional), cu cuvintele lui: „M-am răzgândit”, „Am comandat din greșeală”...
alter table sales.orders add column if not exists cancel_details text;
alter table sales.orders drop constraint if exists orders_cancel_details_check;
alter table sales.orders add constraint orders_cancel_details_check check (char_length(cancel_details) <= 300);

-- Aceeași funcție ca în 029, plus cine și când: se completează doar în clipa anulării, apoi nu se
-- mai schimbă. Doar funcția clientului de mai jos scrie „customer”; orice altă anulare e a ta.
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
        new.cancelled_by := coalesce(new.cancelled_by, 'shop');
        new.cancelled_at := now();
    else
        -- în rest nu se schimbă
        new.cancel_reason  := old.cancel_reason;
        new.cancelled_by   := old.cancelled_by;
        new.cancelled_at   := old.cancelled_at;
        new.cancel_details := old.cancel_details;
    end if;
    return new;
end;
$$;

drop trigger if exists orders_cancel_reason on sales.orders;
create trigger orders_cancel_reason
    before update of status, cancel_reason, cancelled_by, cancelled_at, cancel_details on sales.orders
    for each row
    execute function sales.set_cancel_reason();

-- ---------- 2. Se mai poate anula? ----------
-- Da, cât timp comanda n-a plecat: nouă, confirmată sau gata de ridicare (ridicarea din magazin),
-- și fără AWB. AWB-ul contează și singur: dacă îl pui înainte să marchezi „Expediată”, coletul
-- e deja etichetat, deci clientul nu o mai poate anula din acel moment.
create or replace function sales.orders_can_cancel(o sales.orders)
    returns boolean
    language sql
    stable
    set search_path = pg_catalog, pg_temp
as $$
    select o.status in ('new', 'confirmed', 'ready_for_pickup')
       and coalesce(btrim(o.awb), '') = '';
$$;

-- ---------- 3. Butonul „Anulează comanda” al clientului ----------
-- Are voie:
--   - clientul conectat, pentru comenzile lui, oricând;
--   - cine are linkul comenzii (id-ul lung, din mailul de confirmare), cât timp linkul e valabil:
--     30 de zile, ca pagina comenzii (sales.order_receipt, migrația 012).
-- reason = motivul ales de client, opțional.
create or replace function sales.customer_cancel_order(order_id uuid, reason text default null)
    returns sales.orders
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_order sales.orders;
    v_user  uuid := nullif(current_setting('jwt.claims.user_id', true), '')::uuid;
begin
    -- Încuiem rândul comenzii: dacă tu tocmai o expediezi din admin, unul dintre noi așteaptă
    -- după celălalt și vede starea nouă. Așa nu se poate anula o comandă deja predată curierului.
    select o.* into v_order
    from sales.orders o
    where o.id = customer_cancel_order.order_id
    for update;

    -- Fără drept = „nu există”: nu spunem cuiva care ghicește că a nimerit o comandă.
    -- Atenție la null: o comandă fără cont are user_id null, un vizitator are v_user null,
    -- iar null = null dă null („nu știu”), nu adevărat. De aceea „is true”.
    if v_order.id is null
       or ((v_user is not null and v_order.user_id = v_user)
           or v_order.created_at > now() - interval '30 days') is not true then
        raise exception 'Nu am găsit comanda.';
    end if;

    if not sales.orders_can_cancel(v_order) then
        raise exception '%', case v_order.status
            when 'cancelled' then 'Comanda e deja anulată.'
            when 'delivered' then 'Comanda a fost livrată. Dacă te-ai răzgândit, o poți returna în 14 zile de la primire.'
            else 'Comanda a plecat deja spre tine și nu mai poate fi anulată. O poți refuza la livrare '
                 || 'sau o poți returna în 14 zile după ce o primești.'
        end;
    end if;

    update sales.orders o
    set status         = 'cancelled',
        cancel_reason  = 'customer',
        cancelled_by   = 'customer',
        cancel_details = nullif(left(btrim(customer_cancel_order.reason), 300), '')
    where o.id = v_order.id
    returning o.* into v_order;

    return v_order;
end;
$$;

-- Rezultatul mutației se numește „order” în GraphQL
comment on function sales.customer_cancel_order(uuid, text) is E'@resultFieldName order';

-- ---------- 4. Pagina formularului de retur știe și ea dacă se mai poate anula ----------
-- Aceeași funcție ca în migrația 024, plus „canCancel”: înainte de expediere, pagina îi arată
-- clientului întâi anularea (un clic), apoi formularul, pentru cine vrea doar unele produse.
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
        'canCancel', sales.orders_can_cancel(v_order),
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

-- ---------- 5. Cine ce are voie ----------
-- Vizitatorul (cu linkul din mail) și clientul conectat; adminul le moștenește.
-- Coloanele noi le citește oricine vede comanda; le scrie doar funcția de mai sus și trigger-ul.
grant execute on function sales.orders_can_cancel(sales.orders) to panos_anonymous;
grant execute on function sales.customer_cancel_order(uuid, text) to panos_anonymous;

commit;
