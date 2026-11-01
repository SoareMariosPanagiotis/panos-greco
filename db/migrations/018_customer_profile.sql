-- 018: „Contul meu” complet: date editabile, telefon, adrese salvate.
-- Le folosim ca să completăm singuri formularul de comandă.
-- Se poate rula de mai multe ori: tot ce face verifică întâi dacă există deja.

begin;

-- ---------- 1. Telefonul clientului ----------

-- Opțional: conturile vechi nu au telefon. Îl păstrăm fără spații („0722123456”), ca la comenzi.
alter table auth.users
    add column if not exists phone text;

alter table auth.users drop constraint if exists users_phone_check;
alter table auth.users add constraint users_phone_check
    check (phone ~ '^(\+?40|0)[237][0-9]{8}$');

-- ---------- 2. Modificarea datelor personale ----------

-- Emailul NU se schimbă de aici: un email nou trebuie întâi verificat (A4).
-- security definer: clientul nu are voie să scrie direct în auth.users,
-- deci singura ușă e funcția asta, și ea modifică doar contul din bilet.
create or replace function auth.update_profile(first_name text, last_name text, phone text default null)
    returns auth.users
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_first text := nullif(btrim(update_profile.first_name), '');
    v_last  text := nullif(btrim(update_profile.last_name), '');
    v_phone text := nullif(regexp_replace(coalesce(update_profile.phone, ''), '[\s.()-]', '', 'g'), '');
    account auth.users;
begin
    if v_last is null or char_length(v_last) > 50 then
        raise exception 'Completează numele.';
    end if;
    if v_first is null or char_length(v_first) > 50 then
        raise exception 'Completează prenumele.';
    end if;
    if v_phone is not null and v_phone !~ '^(\+?40|0)[237][0-9]{8}$' then
        raise exception 'Numărul de telefon nu este valid. Exemplu: 0722 123 456';
    end if;

    update auth.users u
    set first_name = v_first,
        last_name  = v_last,
        phone      = v_phone
    where u.id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid
    returning u.* into account;

    if account.id is null then
        raise exception 'Intră în cont ca să îți modifici datele.';
    end if;
    return account;
end;
$$;

-- După o comandă: telefonul rămâne în cont, dar DOAR dacă nu era deja unul.
-- Pe cel ales de client în „Datele mele” nu îl schimbăm niciodată de aici.
create or replace function auth.remember_phone(phone text)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
update auth.users u
set phone = regexp_replace(remember_phone.phone, '[\s.()-]', '', 'g')
where u.id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid
  and u.phone is null
  and regexp_replace(remember_phone.phone, '[\s.()-]', '', 'g') ~ '^(\+?40|0)[237][0-9]{8}$';
$$;

-- ---------- 3. Adresele salvate („Adresele mele”) ----------

-- Un client, mai multe adrese (relație 1 la n). Dacă se șterge contul, se șterg și ele.
create table if not exists sales.customer_addresses (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    county      text not null check (char_length(county) between 1 and 50),
    city        text not null check (char_length(city) between 1 and 100),
    address     text not null check (char_length(address) between 1 and 200),
    postal_code text check (postal_code ~ '^[0-9]{6}$'),
    is_default  boolean not null default false,
    created_at  timestamptz not null default now()
);

create index if not exists customer_addresses_user_id_idx on sales.customer_addresses (user_id);

-- Cel mult O adresă implicită pe client. Index unic PARȚIAL: se uită doar la rândurile
-- cu is_default = true, deci un client poate avea oricâte adrese, dar o singură implicită.
create unique index if not exists customer_addresses_one_default
    on sales.customer_addresses (user_id) where is_default;

-- Clientul își vede doar adresele lui (RLS). Scrie DOAR prin funcțiile de mai jos.
alter table sales.customer_addresses enable row level security;
drop policy if exists customer_addresses_own on sales.customer_addresses;
create policy customer_addresses_own on sales.customer_addresses
    for select to panos_customer
    using (user_id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid);

-- API-ul nu mai arată ușile automate de creat/modificat/șters: avem funcțiile noastre
comment on table sales.customer_addresses is E'@omit create,update,delete';

-- Adaugă sau modifică o adresă. Fără id = adresă nouă.
create or replace function sales.save_address(
    address_id  uuid,
    county      text,
    city        text,
    address     text,
    postal_code text default null
)
    returns sales.customer_addresses
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_me     uuid := nullif(current_setting('jwt.claims.user_id', true), '')::uuid;
    v_county text := nullif(btrim(save_address.county), '');
    v_city   text := nullif(btrim(save_address.city), '');
    v_line   text := nullif(btrim(save_address.address), '');
    v_postal text := nullif(btrim(save_address.postal_code), '');
    saved    sales.customer_addresses;
begin
    if v_me is null then
        raise exception 'Intră în cont ca să îți salvezi adresele.';
    end if;
    if v_county is null or v_city is null or v_line is null then
        raise exception 'Completează județul, localitatea și adresa.';
    end if;
    if char_length(v_county) > 50 or char_length(v_city) > 100 or char_length(v_line) > 200 then
        raise exception 'Adresa este prea lungă.';
    end if;
    if v_postal is not null and v_postal !~ '^[0-9]{6}$' then
        raise exception 'Codul poștal are 6 cifre.';
    end if;

    if save_address.address_id is null then
        -- Aceeași adresă de două ori nu o dublăm: o întoarcem pe cea existentă
        select a.* into saved
        from sales.customer_addresses a
        where a.user_id = v_me
          and lower(a.county) = lower(v_county)
          and lower(a.city) = lower(v_city)
          and lower(a.address) = lower(v_line)
          and a.postal_code is not distinct from v_postal;

        if saved.id is null then
            if (select count(*) from sales.customer_addresses a where a.user_id = v_me) >= 10 then
                raise exception 'Poți salva cel mult 10 adrese. Șterge una pe care nu o mai folosești.';
            end if;

            insert into sales.customer_addresses (user_id, county, city, address, postal_code, is_default)
            values (v_me, v_county, v_city, v_line, v_postal,
                    -- prima adresă devine automat cea implicită
                    not exists (select 1 from sales.customer_addresses a where a.user_id = v_me))
            returning * into saved;
        end if;
    else
        -- „and a.user_id = v_me”: funcția ocolește RLS, deci verificăm NOI că adresa e a lui
        update sales.customer_addresses a
        set county      = v_county,
            city        = v_city,
            address     = v_line,
            postal_code = v_postal
        where a.id = save_address.address_id
          and a.user_id = v_me
        returning a.* into saved;

        if saved.id is null then
            raise exception 'Adresa nu există.';
        end if;
    end if;

    return saved;
end;
$$;

-- Alege adresa implicită: cea completată singură la comandă
create or replace function sales.set_default_address(address_id uuid)
    returns sales.customer_addresses
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_me  uuid := nullif(current_setting('jwt.claims.user_id', true), '')::uuid;
    saved sales.customer_addresses;
begin
    if not exists (
        select 1 from sales.customer_addresses a
        where a.id = set_default_address.address_id and a.user_id = v_me
    ) then
        raise exception 'Adresa nu există.';
    end if;

    -- Întâi o stingem pe cea veche, apoi o aprindem pe cea nouă:
    -- indexul unic nu permite două adrese implicite nici măcar pentru o clipă
    update sales.customer_addresses a
    set is_default = false
    where a.user_id = v_me
      and a.is_default
      and a.id <> set_default_address.address_id;

    update sales.customer_addresses a
    set is_default = true
    where a.id = set_default_address.address_id
      and a.user_id = v_me
    returning a.* into saved;

    return saved;
end;
$$;

-- Șterge o adresă. Dacă era cea implicită, implicită devine cea mai nouă dintre cele rămase.
create or replace function sales.delete_address(address_id uuid)
    returns sales.customer_addresses
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_me    uuid := nullif(current_setting('jwt.claims.user_id', true), '')::uuid;
    deleted sales.customer_addresses;
begin
    delete from sales.customer_addresses a
    where a.id = delete_address.address_id
      and a.user_id = v_me
    returning a.* into deleted;

    if deleted.id is null then
        raise exception 'Adresa nu există.';
    end if;

    if deleted.is_default then
        update sales.customer_addresses a
        set is_default = true
        where a.id = (
            select b.id from sales.customer_addresses b
            where b.user_id = v_me
            order by b.created_at desc
            limit 1
        );
    end if;

    return deleted;
end;
$$;

-- ---------- 4. Cine ce are voie ----------

-- Funcțiile noi nu le poate apela nimeni până nu dăm voie (vezi 007)
grant execute on function auth.update_profile(text, text, text) to panos_customer;
grant execute on function auth.remember_phone(text) to panos_customer;
grant execute on function sales.save_address(uuid, text, text, text, text) to panos_customer;
grant execute on function sales.set_default_address(uuid) to panos_customer;
grant execute on function sales.delete_address(uuid) to panos_customer;
-- Citirea adreselor: doar select. Scrisul trece prin funcții.
grant select on sales.customer_addresses to panos_customer;

commit;
