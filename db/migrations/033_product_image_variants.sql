-- 033: Fiecare mărime cu poza ei.
-- O poză poate fi legată de o mărime a produsului (de ex. canistra de 5 l). Pe site, când clientul
-- alege mărimea, galeria sare la poza ei. Fără mărime = poză generală a produsului.
-- Se poate rula de mai multe ori.

begin;

-- on delete set null: dacă ștergi o mărime, poza rămâne, doar devine generală
alter table catalog.product_images
    add column if not exists variant_id uuid references catalog.product_variants (id) on delete set null;

-- Indexul: PostGraphile face din el relația, iar căutarea „pozele mărimii X” e rapidă
create index if not exists product_images_variant_idx on catalog.product_images (variant_id);

-- Adminul poate schimba și mărimea unei poze (pe lângă ordine și descriere, din 032)
grant update (variant_id) on catalog.product_images to panos_admin;

-- Mărimea trebuie să fie a aceluiași produs. O cheie străină simplă nu poate verifica asta
-- (ar accepta orice mărime din magazin), așa că verificăm cu un trigger.
create or replace function catalog.product_images_check_variant()
    returns trigger
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
begin
    if new.variant_id is not null and not exists (
        select 1
        from catalog.product_variants v
        where v.id = new.variant_id
          and v.product_id = new.product_id
    ) then
        raise exception 'Mărimea aleasă e de la alt produs.' using errcode = '23514';
    end if;
    return new;
end;
$$;

drop trigger if exists product_images_check_variant on catalog.product_images;
create trigger product_images_check_variant
    before insert or update of variant_id, product_id on catalog.product_images
    for each row execute function catalog.product_images_check_variant();

commit;
