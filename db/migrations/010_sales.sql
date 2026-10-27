-- Schema vânzărilor: comenzi, livrare și plată
create schema sales;

-- ---------- Setări: metodele de livrare și plată (le modifici din admin) ----------

create table sales.delivery_methods (
                                        id            uuid primary key default gen_random_uuid(),
                                        code          text not null unique,           -- identificator stabil, folosit în cod
                                        name          text not null,                  -- ce vede clientul
                                        description   text,
                                        price         numeric(10,2) not null default 0 check (price >= 0),
                                        free_over     numeric(10,2) check (free_over >= 0),  -- gratuit peste această sumă (null = niciodată)
                                        needs_address boolean not null default true,  -- la ridicare din magazin nu cerem adresă
                                        city          text,                           -- completat = livrare doar în acest oraș
                                        is_active     boolean not null default true,
                                        sort_order    integer not null default 0
);

create table sales.payment_methods (
                                       id          uuid primary key default gen_random_uuid(),
                                       code        text not null unique,
                                       name        text not null,
                                       description text,
                                       fee         numeric(10,2) not null default 0 check (fee >= 0),  -- ex: taxă ramburs, dacă vrei una
                                       is_active   boolean not null default true,
                                       sort_order  integer not null default 0
);

-- Prețurile sunt de pornire: le schimbi din admin
insert into sales.delivery_methods
(code, name, description, price, free_over, needs_address, city, sort_order)
values
    ('courier', 'Livrare prin curier', 'Livrare în toată România, în 1–3 zile lucrătoare.', 20, 200, true, null, 1),
    ('local', 'Livrare în Galați', 'Livrăm gratuit la adresa ta din Galați.', 0, null, true, 'Galați', 2),
    ('pickup', 'Ridicare din magazin', 'Ridici comanda gratuit din magazinul nostru.', 0, null, false, null, 3);

insert into sales.payment_methods (code, name, description, is_active, sort_order)
values
    ('cash_on_delivery', 'Plata la livrare (ramburs)',
     'Plătești când primești coletul sau când îl ridici din magazin.', true, 1),
    -- Oprită până integrăm un procesator de plăți
    ('card', 'Card online', 'Plată securizată cu cardul, direct pe site.', false, 2);

-- ---------- Comenzile ----------

create table sales.orders (
                              id                 uuid primary key default gen_random_uuid(),
    -- Număr scurt pentru oameni („comanda #1001”). Id-ul rămâne pentru linkuri, fiindcă nu se poate ghici
                              order_number       integer generated always as identity (start with 1001) unique,
    -- Opțional: se poate comanda și fără cont
                              user_id            uuid references auth.users(id) on delete set null,
                              status             text not null default 'new'
                                  check (status in ('new', 'confirmed', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled')),

    -- Clientul
                              customer_name      text not null,
                              email              text not null,
                              phone              text not null,

    -- Livrarea. Numele metodei e copiat, ca să rămână corect chiar dacă o redenumești
                              delivery_method_id uuid not null references sales.delivery_methods(id),
                              delivery_name      text not null,
                              county             text,
                              city               text,
                              address            text,
                              postal_code        text,

    -- Factură pe firmă (opțional)
                              company_name       text,
                              company_cui        text,
                              company_reg_no     text,

    -- Plata
                              payment_method_id  uuid not null references sales.payment_methods(id),
                              payment_name       text not null,
                              payment_status     text not null default 'pending'
                                  check (payment_status in ('pending', 'paid', 'refunded')),

    -- Sumele, toate cu TVA
                              subtotal           numeric(10,2) not null check (subtotal >= 0),
                              discount_total     numeric(10,2) not null default 0 check (discount_total >= 0),
                              shipping_total     numeric(10,2) not null default 0 check (shipping_total >= 0),
                              payment_fee        numeric(10,2) not null default 0 check (payment_fee >= 0),
                              total              numeric(10,2) not null,

    -- Expedierea
                              courier            text,
                              awb                text,

                              customer_note      text,
                              created_at         timestamptz not null default now(),

    -- Totalul trebuie să iasă din calcul, altfel baza refuză comanda
                              constraint total_matches
                                  check (total = subtotal - discount_total + shipping_total + payment_fee),
    -- La factură pe firmă, numele firmei și CUI-ul vin împreună
                              constraint company_complete
                                  check ((company_name is null) = (company_cui is null))
);

create table sales.order_items (
                                   id           uuid primary key default gen_random_uuid(),
                                   order_id     uuid not null references sales.orders(id) on delete cascade,
    -- Fără cascade: o mărime care apare în comenzi nu poate fi ștearsă
                                   variant_id   uuid not null references catalog.product_variants(id),
    -- Copii de la momentul comenzii: dacă mâine schimbi prețul sau numele,
    -- comanda, emailul și factura arată în continuare ce s-a cumpărat atunci
                                   product_name text not null,
                                   size_label   text not null,
                                   unit_price   numeric(10,2) not null check (unit_price >= 0),
                                   vat_rate     numeric(4,2) not null,
                                   quantity     integer not null check (quantity > 0),
    -- Coloană calculată: Postgres o ține singur la zi
                                   line_total   numeric(10,2) generated always as (unit_price * quantity) stored
);

create table sales.order_status_history (
                                            id         uuid primary key default gen_random_uuid(),
                                            order_id   uuid not null references sales.orders(id) on delete cascade,
                                            status     text not null,
                                            created_at timestamptz not null default now()
);

-- Postgres nu creează singur indexuri pe cheile străine
create index on sales.orders (user_id);
create index on sales.orders (created_at desc);
create index on sales.order_items (order_id);
create index on sales.order_items (variant_id);
create index on sales.order_status_history (order_id);

-- ---------- Trigger: istoricul stărilor se scrie singur ----------

create function sales.log_status_change()
    returns trigger
    language plpgsql
security definer
set search_path = sales, pg_temp
as $$
begin
  -- La comandă nouă, sau când se schimbă starea, adăugăm un rând în istoric
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into sales.order_status_history (order_id, status)
    values (new.id, new.status);
end if;
return new;
end;
$$;

create trigger orders_status_history
    after insert or update of status on sales.orders
    for each row execute function sales.log_status_change();

-- ---------- API: ascundem operațiile care nu au voie să existe ----------

comment on table sales.orders is E'@omit create,delete';
comment on table sales.order_items is E'@omit create,update,delete';
comment on table sales.order_status_history is E'@omit create,update,delete';

-- ---------- Drepturi ----------

-- Vizitatorii văd metodele de livrare și plată (doar pe cele active, vezi RLS)
grant usage on schema sales to panos_anonymous;
grant select on sales.delivery_methods, sales.payment_methods to panos_anonymous;

-- Clienții pot citi comenzi; RLS decide care. Adminul moștenește dreptul
grant select on sales.orders, sales.order_items, sales.order_status_history to panos_customer;

-- Adminul modifică setările de livrare și plată
grant insert, update, delete on sales.delivery_methods, sales.payment_methods to panos_admin;

-- Adminul poate schimba DOAR starea, plata, AWB-ul și datele de contact.
-- Sumele și produsele unei comenzi nu se mai modifică, iar comenzile nu se șterg.
grant update (status, payment_status, courier, awb, phone, county, city, address, postal_code)
    on sales.orders to panos_admin;

-- ---------- Row Level Security ----------

alter table sales.delivery_methods enable row level security;
create policy delivery_methods_read on sales.delivery_methods
  for select to panos_anonymous using (is_active);
create policy delivery_methods_admin on sales.delivery_methods
  for all to panos_admin using (true) with check (true);

alter table sales.payment_methods enable row level security;
create policy payment_methods_read on sales.payment_methods
  for select to panos_anonymous using (is_active);
create policy payment_methods_admin on sales.payment_methods
  for all to panos_admin using (true) with check (true);

alter table sales.orders enable row level security;
-- Clientul vede doar comenzile lui
create policy orders_own on sales.orders
  for select to panos_customer
                 using (user_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid);
create policy orders_admin on sales.orders
  for all to panos_admin using (true) with check (true);

-- Produsele și istoricul sunt vizibile exact când e vizibilă comanda:
-- subinterogarea pe orders respectă și ea politicile de mai sus
alter table sales.order_items enable row level security;
create policy order_items_read on sales.order_items
  for select to panos_customer
                 using (exists (select 1 from sales.orders o where o.id = order_items.order_id));

alter table sales.order_status_history enable row level security;
create policy order_status_history_read on sales.order_status_history
  for select to panos_customer
                 using (exists (select 1 from sales.orders o where o.id = order_status_history.order_id));