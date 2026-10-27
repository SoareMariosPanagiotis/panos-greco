-- Funcții pentru pagina de comandă și pentru pagina de confirmare

-- ---------- Prețurile reale pentru produsele din coș ----------
-- Coșul din browser poate avea prețuri vechi; pagina de comandă le cere din nou de aici
create function catalog.variants_by_ids(ids uuid[])
    returns setof catalog.product_variants
language sql
stable
strict
as $$
select * from catalog.product_variants
where id = any(ids);
$$;

grant execute on function catalog.variants_by_ids(uuid[]) to panos_anonymous;

-- ---------- Bonul comenzii, pentru pagina de confirmare ----------
-- Un vizitator fără cont nu poate citi tabelul de comenzi. Aceste funcții îi arată
-- DOAR comanda al cărei id îl știe. Id-ul (uuid) e imposibil de ghicit, deci
-- funcționează ca o parolă ascunsă în link.
-- Parametrul se numește receipt_id, nu order_id, ca să nu se confunde cu coloana order_id.
create function sales.order_receipt(receipt_id uuid)
    returns sales.orders
    language sql
    stable
strict
security definer
set search_path = pg_catalog, pg_temp
as $$
select o.* from sales.orders o
where o.id = receipt_id
  -- Linkul expiră după 30 de zile: datele personale nu rămân accesibile la nesfârșit
  and o.created_at > now() - interval '30 days';
$$;

create function sales.order_receipt_items(receipt_id uuid)
    returns setof sales.order_items
language sql
stable
strict
security definer
set search_path = pg_catalog, pg_temp
as $$
select i.* from sales.order_items i
                    join sales.orders o on o.id = i.order_id
where o.id = receipt_id
  and o.created_at > now() - interval '30 days'
order by i.product_name, i.unit_price;
$$;

grant execute on function sales.order_receipt(uuid) to panos_anonymous;
grant execute on function sales.order_receipt_items(uuid) to panos_anonymous;