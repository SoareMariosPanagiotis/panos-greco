-- 034: Mai multe poze pe produs: cel mult 20, în loc de 12.
-- Uleiul are acum câte trei poze pentru fiecare mărime (scena, avantajele, eticheta), plus pozele
-- generale, deci 12 nu mai ajung. Funcția e aceeași ca în 032; se schimbă doar limita.
-- Se poate rula de mai multe ori.

begin;

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

    if (select count(*) from catalog.product_images i where i.product_id = add_product_image.product_id) >= 20 then
        raise exception 'Un produs poate avea cel mult 20 de poze.' using errcode = '22023';
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

commit;
