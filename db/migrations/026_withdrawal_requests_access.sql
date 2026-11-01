-- 026: Repară eroarea „permission denied for table withdrawals” din „Contul meu”.
--
-- De ce a apărut: în 024 i-am dat clientului drept de citire doar pe unele coloane
-- (fără IBAN și fără nota ta). Dar PostGraphile, când aduce o listă legată de comandă
-- (withdrawalsByOrderId), citește rândul întreg („select *”) și abia apoi alege câmpurile.
-- Rândul întreg conține și IBAN-ul, deci Postgres refuză tot tabelul.
--
-- Soluția: clientul nu mai citește deloc tabelul. Primește un câmp calculat pe comandă,
-- order.withdrawalRequests, care întoarce doar data și starea cererilor.
-- O migrație aplicată nu se modifică: o reparăm cu una nouă. Se poate rula de mai multe ori.

begin;

-- ---------- 1. Câmpul calculat: cererile de retragere ale comenzii ----------

create or replace function sales.orders_withdrawal_requests(o sales.orders)
    returns jsonb
    language sql
    stable
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'createdAt', w.created_at, 'status', w.status)
                              order by w.created_at), '[]'::jsonb)
    from sales.withdrawals w
    where w.order_id = o.id;
$$;

-- Clientul îl vede doar pe comenzile lui: rândul comenzii îl primește prin RLS-ul comenzilor
grant execute on function sales.orders_withdrawal_requests(sales.orders) to panos_customer;

-- ---------- 2. Clientul nu mai citește tabelele cererilor ----------

revoke select on sales.withdrawals from panos_customer;
revoke select (id, order_id, customer_name, email, reason, statement, status, created_at, updated_at)
    on sales.withdrawals from panos_customer;
revoke select on sales.withdrawal_items from panos_customer;

drop policy if exists withdrawals_own on sales.withdrawals;
drop policy if exists withdrawal_items_read on sales.withdrawal_items;

-- ---------- 3. Adminul: dreptul pe produsele cererilor îl primește direct ----------
-- (până acum îl moștenea de la panos_customer)

grant select on sales.withdrawal_items to panos_admin;

drop policy if exists withdrawal_items_admin on sales.withdrawal_items;
create policy withdrawal_items_admin on sales.withdrawal_items
    for select to panos_admin using (true);

commit;
