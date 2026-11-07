-- 032: Pozele produselor (o galerie pentru fiecare produs), încărcate din admin.
--
-- Pozele stau în baza de date, ca PDF-urile facturilor (030): intră în npm run db:backup și nu cer
-- alt serviciu. Fișierul e un WebP făcut de site (sharp): micșorat la cel mult 2000 px și fără
-- datele ascunse din poza originală (EXIF: locul GPS, telefonul).
--
-- Două tabele, ca să nu ajungă octeții pozei în API din greșeală:
--   catalog.product_images               ce se vede în API: produsul, ordinea, textul alternativ, mărimea
--   catalog_private.product_image_files  fișierul propriu-zis, într-o schemă pe care PostGraphile n-o vede
--
-- Poza principală = cea cu position cel mai mic. Câmpul imageUrl al produsului rămâne în API, dar
-- de acum e calculat din galerie (coloana veche image_url era mereu goală și dispare).
--
-- Se poate rula de mai multe ori.

begin;

-- ---------- 1. Schema privată, pentru fișiere ----------

create schema if not exists catalog_private;
revoke all on schema catalog_private from public;

-- ---------- 2. Tabelele ----------

create table if not exists catalog.product_images (
    id         uuid primary key default gen_random_uuid(),
    product_id uuid not null references catalog.products (id) on delete cascade,
    position   integer not null default 0,
    alt        text check (char_length(alt) <= 200),       -- descrierea pozei (Google, cititoare de ecran)
    width      integer not null check (width between 1 and 4000),
    height     integer not null check (height between 1 and 4000),
    created_at timestamptz not null default now()
);

-- Indexul pe product_id: PostGraphile face din el relația productImagesByProductId
create index if not exists product_images_product_position_idx
    on catalog.product_images (product_id, position);

-- @omit create: poza nouă intră doar prin add_product_image (care primește și fișierul)
comment on table catalog.product_images is
    E'@omit create\nPozele unui produs. Prima (position cel mai mic) e poza principală.';

create table if not exists catalog_private.product_image_files (
    image_id uuid primary key references catalog.product_images (id) on delete cascade,
    data     bytea not null check (octet_length(data) between 12 and 3145728)  -- cel mult 3 MB
);

-- WebP e deja comprimat: Postgres nu mai încearcă să-l comprime încă o dată
alter table catalog_private.product_image_files alter column data set storage external;

-- ---------- 3. Drepturi ----------
-- Drepturile implicite din 006 dau select vizitatorilor și insert/update/delete adminului.
-- Le strângem: adminul schimbă doar ordinea și textul alternativ și poate șterge o poză.

revoke insert, update on catalog.product_images from panos_admin;
grant update (alt, position) on catalog.product_images to panos_admin;
grant delete on catalog.product_images to panos_admin;
grant select on catalog.product_images to panos_anonymous;

alter table catalog.product_images enable row level security;

-- Vizitatorii văd pozele doar la produsele pe care le văd (RLS de pe products ascunde produsele inactive)
drop policy if exists product_images_public_read on catalog.product_images;
create policy product_images_public_read on catalog.product_images
    for select to panos_anonymous
    using (exists (select 1 from catalog.products p where p.id = product_id));

drop policy if exists product_images_admin_all on catalog.product_images;
create policy product_images_admin_all on catalog.product_images
    for all to panos_admin
    using (true)
    with check (true);

-- ---------- 4. Poza principală, ca imageUrl în API ----------
-- Nu e security definer: respectă RLS, deci vizitatorul primește doar ce are voie să vadă.

alter table catalog.products drop column if exists image_url;

create or replace function catalog.products_image_url(p catalog.products)
    returns text
    language sql
    stable
    set search_path = pg_catalog, pg_temp
as $$
    select '/imagini/' || i.id
    from catalog.product_images i
    where i.product_id = p.id
    order by i.position, i.created_at
    limit 1
$$;

revoke all on function catalog.products_image_url(catalog.products) from public;
grant execute on function catalog.products_image_url(catalog.products) to panos_anonymous;

-- ---------- 5. Adăugarea unei poze (doar adminul) ----------
-- image = fișierul WebP ca text base64 (GraphQL nu trimite octeți direct).
-- Argumentele au același nume ca unele coloane, așa că le scriem mereu cu numele funcției în față.

create or replace function catalog.add_product_image(
    product_id uuid,
    image      text,
    width      integer,
    height     integer,
    alt        text default null
)
    returns catalog.product_images
    language plpgsql
    volatile
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_bytes bytea;
    v_row   catalog.product_images;
begin
    begin
        v_bytes := decode(add_product_image.image, 'base64');
    exception when others then
        raise exception 'Poza nu a ajuns întreagă. Încearcă din nou.' using errcode = '22023';
    end;

    -- Un fișier WebP începe cu „RIFF”, iar de la octetul 9 scrie „WEBP”
    if octet_length(v_bytes) < 12
        or substring(v_bytes from 1 for 4) <> '\x52494646'::bytea
        or substring(v_bytes from 9 for 4) <> '\x57454250'::bytea then
        raise exception 'Fișierul primit nu e o poză WebP.' using errcode = '22023';
    end if;

    if not exists (select 1 from catalog.products p where p.id = add_product_image.product_id) then
        raise exception 'Produsul nu există.' using errcode = 'P0002';
    end if;

    if (select count(*) from catalog.product_images i where i.product_id = add_product_image.product_id) >= 12 then
        raise exception 'Un produs poate avea cel mult 12 poze.' using errcode = '22023';
    end if;

    -- Poza nouă intră la final; prima poză a unui produs devine automat principala
    insert into catalog.product_images (product_id, position, alt, width, height)
    values (
        add_product_image.product_id,
        coalesce((select max(i.position) + 1
                  from catalog.product_images i
                  where i.product_id = add_product_image.product_id), 0),
        nullif(btrim(add_product_image.alt), ''),
        add_product_image.width,
        add_product_image.height
    )
    returning * into v_row;

    insert into catalog_private.product_image_files (image_id, data)
    values (v_row.id, v_bytes);

    return v_row;
end;
$$;

comment on function catalog.add_product_image(uuid, text, integer, integer, text) is
    E'@resultFieldName productImage\nAdaugă o poză (WebP, base64) la finalul galeriei unui produs.';

revoke all on function catalog.add_product_image(uuid, text, integer, integer, text) from public;
grant execute on function catalog.add_product_image(uuid, text, integer, integer, text) to panos_admin;

-- ---------- 6. „Fă-o principală” (doar adminul) ----------
-- Nu e security definer: rulează cu drepturile adminului (update pe position).

create or replace function catalog.make_product_image_main(image_id uuid)
    returns catalog.product_images
    language sql
    volatile
    set search_path = pg_catalog, pg_temp
as $$
    update catalog.product_images i
    set position = (select min(o.position) - 1
                    from catalog.product_images o
                    where o.product_id = i.product_id)
    where i.id = make_product_image_main.image_id
    returning i.*
$$;

comment on function catalog.make_product_image_main(uuid) is
    E'@resultFieldName productImage\nMută poza pe primul loc, deci devine poza principală.';

revoke all on function catalog.make_product_image_main(uuid) from public;
grant execute on function catalog.make_product_image_main(uuid) to panos_admin;

-- ---------- 7. Fișierul unei poze, pentru ruta /imagini/[id] ----------
-- Security definer, pentru că vizitatorul nu are acces la catalog_private. Întoarce null dacă nu există.

create or replace function catalog.product_image_data(image_id uuid)
    returns text
    language sql
    stable
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    select encode(f.data, 'base64')
    from catalog_private.product_image_files f
    where f.image_id = product_image_data.image_id
$$;

revoke all on function catalog.product_image_data(uuid) from public;
grant execute on function catalog.product_image_data(uuid) to panos_anonymous;

commit;
