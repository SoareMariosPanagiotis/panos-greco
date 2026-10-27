-- 013_order_workflow.sql
-- Regulile de stare ale comenzilor (diagrama) + pregătirea pentru emailuri

-- 1) Ce metode de livrare cer AWB la expediere: curierul da, Galați și magazinul nu
alter table sales.delivery_methods
    add column needs_awb boolean not null default false;

update sales.delivery_methods
set needs_awb = true
where code = 'courier';

-- 2) Paznicul: verifică fiecare schimbare ÎNAINTE să fie salvată
create function sales.check_status_transition()
    returns trigger
    language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
-- dicționar: codul din baza de date -> numele în română
v_labels constant jsonb := '{
    "new": "Nouă",
    "confirmed": "Confirmată",
    "ready_for_pickup": "Gata de ridicare",
    "shipped": "Expediată",
    "delivered": "Livrată",
    "cancelled": "Anulată"
  }';
  v_needs_address boolean;
  v_needs_awb boolean;
begin
  -- Ce fel de livrare are comanda?
select dm.needs_address, dm.needs_awb
into v_needs_address, v_needs_awb
from sales.delivery_methods dm
where dm.id = new.delivery_method_id;

if new.status is distinct from old.status then
    -- Stările finale nu se mai schimbă
    if old.status = 'cancelled' then
      raise exception 'O comandă anulată nu mai poate fi redeschisă.';
end if;
    if old.status = 'delivered' then
      raise exception 'O comandă livrată nu mai poate fi schimbată.';
end if;

    -- Săgețile din diagramă
    if not (
         (old.status = 'new'              and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed'        and new.status in ('shipped', 'ready_for_pickup', 'cancelled'))
      or (old.status = 'shipped'          and new.status in ('delivered', 'cancelled'))
      or (old.status = 'ready_for_pickup' and new.status in ('delivered', 'cancelled'))
    ) then
      raise exception 'O comandă „%” nu poate trece direct în „%”.',
        v_labels ->> old.status, v_labels ->> new.status;
end if;

    -- Ramura de jos e doar pentru ridicare, cea de sus doar pentru livrări
    if new.status = 'ready_for_pickup' and v_needs_address then
      raise exception 'Doar comenzile cu ridicare din magazin pot fi „Gata de ridicare”.';
end if;
    if new.status = 'shipped' and not v_needs_address then
      raise exception 'O comandă cu ridicare din magazin nu se expediază.';
end if;
end if;

  -- La curier, „Expediată” cere firma de curierat și AWB-ul
  if new.status = 'shipped' and v_needs_awb
     and (coalesce(trim(new.courier), '') = '' or coalesce(trim(new.awb), '') = '') then
    raise exception 'Pentru expedierea prin curier completează firma de curierat și AWB-ul.';
end if;

return new;
end;
$$;

create trigger orders_check_transition
    before update of status, courier, awb on sales.orders
    for each row
    execute function sales.check_status_transition();

-- 3) Poarta pentru emailuri: fiecare rând din istoric = un mail de trimis
alter table sales.order_status_history
    add column notified_at timestamptz;

-- Comenzile de test de până acum nu trebuie să primească mailuri
update sales.order_status_history
set notified_at = now();

-- Index doar pe mailurile netrimise, ca să le găsim instant
create index order_status_history_pending_idx
    on sales.order_status_history (created_at)
    where notified_at is null;