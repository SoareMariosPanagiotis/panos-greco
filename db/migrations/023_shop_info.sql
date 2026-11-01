-- 023: Datele firmei, într-un singur loc.
-- Le folosesc subsolul site-ului, pagina Contact, Termenii și condițiile și mailurile
-- (de exemplu adresa la care clientul trimite produsele înapoi).
-- Le schimbi din admin, la „Datele firmei”, fără să atingi codul.
-- Se poate rula de mai multe ori.

begin;

create table if not exists sales.shop_info (
    -- Tabelul are un singur rând: cheia primară poate fi doar „true”
    id                boolean primary key default true check (id),
    legal_name        text not null default 'PANOS GRECO S.R.L.'
                      check (char_length(legal_name) between 2 and 120),
    cui               text check (cui ~ '^(RO)?[0-9]{2,10}$'),
    reg_com           text check (char_length(reg_com) between 3 and 40),   -- nr. de la Registrul Comerțului
    registered_office text check (char_length(registered_office) <= 300),  -- sediul social
    shop_address      text check (char_length(shop_address) <= 300),       -- magazinul: ridicări și retururi
    opening_hours     text check (char_length(opening_hours) <= 200),
    email             text not null default 'office@panos-greco.com'
                      check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    phone             text check (phone ~ '^\+?[0-9 ]{9,16}$'),
    updated_at        timestamptz not null default now()
);

-- Rândul unic. Ce nu știm încă rămâne gol și îl completezi din admin.
insert into sales.shop_info (id) values (true)
on conflict (id) do nothing;

-- Data ultimei modificări se scrie singură
create or replace function sales.touch_updated_at()
    returns trigger
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists shop_info_touch on sales.shop_info;
create trigger shop_info_touch
    before update on sales.shop_info
    for each row execute function sales.touch_updated_at();

-- În API: se citește cu shopInfoById(id: true) și se modifică doar din admin.
-- Nu se creează și nu se șterge (rândul e unul singur).
comment on table sales.shop_info is E'@omit create,delete,all';

-- ---------- Drepturi ----------

-- Oricine le vede: apar pe fiecare pagină, în subsol
grant select on sales.shop_info to panos_anonymous;
-- Adminul le modifică, dar nu poate schimba cheia sau data
grant update (legal_name, cui, reg_com, registered_office, shop_address, opening_hours, email, phone)
    on sales.shop_info to panos_admin;

alter table sales.shop_info enable row level security;

drop policy if exists shop_info_read on sales.shop_info;
create policy shop_info_read on sales.shop_info
    for select to panos_anonymous using (true);

drop policy if exists shop_info_admin on sales.shop_info;
create policy shop_info_admin on sales.shop_info
    for update to panos_admin using (true) with check (true);

commit;
