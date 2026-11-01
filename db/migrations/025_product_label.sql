-- 025: Informațiile de pe etichetă, pe pagina produsului.
-- La vânzarea online, clientul trebuie să vadă ÎNAINTE să cumpere tot ce e obligatoriu
-- pe eticheta unui aliment (Regulamentul UE 1169/2011, art. 14), în afară de data expirării:
-- ingrediente cu alergenii evidențiați, cantitatea, păstrarea, producătorul, originea,
-- valorile nutriționale. Le completezi din admin, de pe etichetă.
-- Se poate rula de mai multe ori.

begin;

-- ---------- 1. Textele de pe etichetă: o coloană pentru fiecare ----------

alter table catalog.products
    -- Alergenii se scriu între steluțe, ex: „făină de *grâu*, *susan*”: pe site apar îngroșați
    add column if not exists ingredients  text check (char_length(ingredients) <= 2000),
    add column if not exists may_contain  text check (char_length(may_contain) <= 300),   -- „Poate conține urme de…”
    add column if not exists storage      text check (char_length(storage) <= 300),       -- condiții de păstrare
    add column if not exists usage_notes  text check (char_length(usage_notes) <= 500),   -- mod de folosire
    add column if not exists origin       text check (char_length(origin) <= 100),        -- țara de origine
    add column if not exists producer     text check (char_length(producer) <= 300),      -- numele și adresa producătorului
    -- Codul organismului de control bio, ex: RO-ECO-008, GR-BIO-01
    add column if not exists organic_code text check (organic_code ~ '^[A-Z]{2}-\S{2,6}-[0-9]{2,3}$'),
    add column if not exists label_notes  text check (char_length(label_notes) <= 1000);  -- alte mențiuni

-- ---------- 2. Valorile nutriționale: un tabel separat, 1 la 1 cu produsul ----------
-- Separat, pentru că nu toate produsele le au (unele sunt scutite) și pentru că
-- au reguli între ele (grăsimile saturate nu pot fi mai multe decât grăsimile).

create table if not exists catalog.product_nutrition (
    product_id   uuid primary key references catalog.products (id) on delete cascade,
    basis        text not null default '100 g' check (basis in ('100 g', '100 ml')),
    energy_kj    numeric(6,1) not null check (energy_kj >= 0),
    energy_kcal  numeric(6,1) not null check (energy_kcal >= 0),
    fat          numeric(5,1) not null check (fat between 0 and 100),
    saturates    numeric(5,1) not null check (saturates between 0 and 100),
    carbohydrate numeric(5,1) not null check (carbohydrate between 0 and 100),
    sugars       numeric(5,1) not null check (sugars between 0 and 100),
    fibre        numeric(5,1) check (fibre between 0 and 100),           -- opțional
    protein      numeric(5,1) not null check (protein between 0 and 100),
    salt         numeric(5,2) not null check (salt between 0 and 100),
    constraint saturates_within_fat check (saturates <= fat),
    constraint sugars_within_carbohydrate check (sugars <= carbohydrate)
);

-- O singură ușă pentru admin: salvează valorile sau, dacă energia e goală, le șterge.
-- Fără „security definer”: rulează cu drepturile adminului, deci și cu RLS-ul lui.
create or replace function catalog.save_product_nutrition(
    product_id   uuid,
    basis        text default '100 g',
    energy_kj    numeric default null,
    energy_kcal  numeric default null,
    fat          numeric default null,
    saturates    numeric default null,
    carbohydrate numeric default null,
    sugars       numeric default null,
    protein      numeric default null,
    salt         numeric default null,
    fibre        numeric default null
)
    returns void
    language plpgsql
    set search_path = pg_catalog, pg_temp
as $$
begin
    if save_product_nutrition.energy_kj is null then
        delete from catalog.product_nutrition n
        where n.product_id = save_product_nutrition.product_id;
        return;
    end if;

    insert into catalog.product_nutrition as n
        (product_id, basis, energy_kj, energy_kcal, fat, saturates, carbohydrate, sugars, fibre, protein, salt)
    values (save_product_nutrition.product_id, save_product_nutrition.basis, save_product_nutrition.energy_kj,
            save_product_nutrition.energy_kcal, save_product_nutrition.fat, save_product_nutrition.saturates,
            save_product_nutrition.carbohydrate, save_product_nutrition.sugars, save_product_nutrition.fibre,
            save_product_nutrition.protein, save_product_nutrition.salt)
    on conflict on constraint product_nutrition_pkey do update
        set basis = excluded.basis,
            energy_kj = excluded.energy_kj,
            energy_kcal = excluded.energy_kcal,
            fat = excluded.fat,
            saturates = excluded.saturates,
            carbohydrate = excluded.carbohydrate,
            sugars = excluded.sugars,
            fibre = excluded.fibre,
            protein = excluded.protein,
            salt = excluded.salt;
end;
$$;

-- În API: se citește prin produs (product.productNutritionByProductId), se scrie doar prin funcție
comment on table catalog.product_nutrition is E'@omit create,update,delete,all';

-- ---------- 3. Drepturi ----------

grant select on catalog.product_nutrition to panos_anonymous;
grant insert, update, delete on catalog.product_nutrition to panos_admin;
grant execute on function catalog.save_product_nutrition(uuid, text, numeric, numeric, numeric, numeric, numeric,
    numeric, numeric, numeric, numeric) to panos_admin;

alter table catalog.product_nutrition enable row level security;

-- Valorile se văd exact când se vede produsul: subinterogarea respectă politicile produselor
drop policy if exists product_nutrition_read on catalog.product_nutrition;
create policy product_nutrition_read on catalog.product_nutrition
    for select to panos_anonymous
    using (exists (select 1 from catalog.products p where p.id = product_nutrition.product_id));

drop policy if exists product_nutrition_admin on catalog.product_nutrition;
create policy product_nutrition_admin on catalog.product_nutrition
    for all to panos_admin using (true) with check (true);

commit;
