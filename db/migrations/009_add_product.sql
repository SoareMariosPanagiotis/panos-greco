-- Creează un produs ÎMPREUNĂ cu prima lui mărime, într-un singur pas.
-- PostGraphile rulează funcția într-o tranzacție: dacă a doua inserare
-- eșuează (ex: cod de bare duplicat), se anulează și prima.
create function catalog.add_product(
    name        text,
    slug        text,
    category_id uuid,
    vat_rate    numeric,
    is_organic  boolean,
    pack_size   integer,
    pack_unit   text,
    price       numeric,
    stock       integer,
    barcode     text default null
)
    returns catalog.products
    language plpgsql
as $$
declare
    new_product catalog.products;
begin
    -- Produsul nou pornește ascuns: devine vizibil după ce îi completezi detaliile
    insert into catalog.products (name, slug, category_id, vat_rate, is_organic, is_active)
    values (add_product.name, add_product.slug, add_product.category_id,
            add_product.vat_rate, add_product.is_organic, false)
    returning * into new_product;

    insert into catalog.product_variants (product_id, pack_size, pack_unit, price, stock, barcode)
    values (new_product.id, add_product.pack_size, add_product.pack_unit,
            add_product.price, add_product.stock, nullif(add_product.barcode, ''));

    return new_product;
end;
$$;

-- Funcțiile noi nu sunt publice (vezi 007): doar adminul o poate apela
grant execute on function
    catalog.add_product(text, text, uuid, numeric, boolean, integer, text, numeric, integer, text)
    to panos_admin;