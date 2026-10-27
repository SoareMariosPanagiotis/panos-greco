-- Plasarea comenzii: o singură funcție care verifică totul și salvează comanda
-- într-o tranzacție. Stocul scade la comandă și revine dacă o anulezi.

-- ---------- Mărimea afișată („1 l”, „2 kg”), calculată în baza de date ----------
-- O funcție care primește un rând din tabel devine în API un câmp nou: sizeLabel
create function catalog.product_variants_size_label(variant catalog.product_variants)
    returns text
    language sql
    immutable
as $$
select case
           when variant.pack_unit = 'ml' and variant.pack_size >= 1000
               then trim_scale(variant.pack_size / 1000.0)::text || ' l'
           when variant.pack_unit = 'g' and variant.pack_size >= 1000
               then trim_scale(variant.pack_size / 1000.0)::text || ' kg'
           else variant.pack_size::text || ' ' || variant.pack_unit
           end;
$$;

grant execute on function catalog.product_variants_size_label(catalog.product_variants) to panos_anonymous;

-- ---------- Plasarea comenzii ----------
create function sales.place_order(
    variant_ids    uuid[],
    quantities     integer[],
    delivery_code  text,
    payment_code   text,
    customer_name  text,
    email          text,
    phone          text,
    county         text default null,
    city           text default null,
    address        text default null,
    postal_code    text default null,
    company_name   text default null,
    company_cui    text default null,
    company_reg_no text default null,
    customer_note  text default null
)
    returns sales.orders
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    delivery   sales.delivery_methods;
    payment    sales.payment_methods;
    item       record;
    v_ids      uuid[];
    v_qtys     integer[];
    v_found    integer := 0;
    v_subtotal numeric(10,2) := 0;
    v_shipping numeric(10,2);
    v_name     text;
    v_email    text;
    v_phone    text;
    v_county   text;
    v_city     text;
    v_address  text;
    v_postal   text;
    v_company  text;
    v_cui      text;
    v_reg      text;
    new_order  sales.orders;
begin
    -- 1. Coșul: două liste de aceeași lungime (mărimile și cantitățile)
    if variant_ids is null or quantities is null
        or cardinality(variant_ids) = 0
        or cardinality(variant_ids) <> cardinality(quantities)
        or cardinality(variant_ids) > 50 then
        raise exception 'Coșul este gol sau invalid.';
    end if;

    if exists (select 1 from unnest(quantities) as q(n) where n is null or n < 1 or n > 99) then
        raise exception 'Cantitatea trebuie să fie între 1 și 99.';
    end if;

    -- Aceeași mărime de două ori în listă se adună într-un singur rând
    select array_agg(c.variant_id order by c.variant_id),
           array_agg(c.quantity order by c.variant_id)
    into v_ids, v_qtys
    from (
             select x.variant_id, sum(x.quantity)::integer as quantity
             from unnest(variant_ids, quantities) as x(variant_id, quantity)
             group by x.variant_id
         ) c;

    -- 2. Livrarea și plata. Funcția rulează cu drepturi de proprietar (RLS nu se aplică),
    --    așa că verificăm NOI că metodele alese sunt active
    select * into delivery from sales.delivery_methods d
    where d.code = delivery_code and d.is_active;
    if not found then
        raise exception 'Metoda de livrare aleasă nu este disponibilă.';
    end if;

    select * into payment from sales.payment_methods p
    where p.code = payment_code and p.is_active;
    if not found then
        raise exception 'Metoda de plată aleasă nu este disponibilă.';
    end if;

    -- 3. Datele clientului
    v_name  := nullif(trim(customer_name), '');
    v_email := lower(nullif(trim(email), ''));
    v_phone := regexp_replace(coalesce(phone, ''), '[\s.()-]', '', 'g');

    if v_name is null or length(v_name) < 3 then
        raise exception 'Completează numele complet.';
    end if;
    if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'Adresa de email nu este validă.';
    end if;
    if v_phone !~ '^(\+?40|0)[237][0-9]{8}$' then
        raise exception 'Numărul de telefon nu este valid. Exemplu: 0722 123 456';
    end if;

    -- 4. Adresa: doar dacă metoda de livrare o cere (nu și la ridicare din magazin)
    if delivery.needs_address then
        v_county  := nullif(trim(county), '');
        v_city    := nullif(trim(city), '');
        v_address := nullif(trim(address), '');
        v_postal  := nullif(trim(postal_code), '');

        if v_county is null or v_city is null or v_address is null then
            raise exception 'Completează adresa de livrare: județ, localitate și adresă.';
        end if;
        if v_postal is not null and v_postal !~ '^[0-9]{6}$' then
            raise exception 'Codul poștal are 6 cifre.';
        end if;
        -- Livrarea locală merge doar în orașul ei; „Galati” fără diacritice e acceptat
        if delivery.city is not null
            and translate(lower(v_city), 'ăâîșşțţ', 'aaisstt')
               <> translate(lower(delivery.city), 'ăâîșşțţ', 'aaisstt') then
            raise exception '„%” este disponibilă doar în %.', delivery.name, delivery.city;
        end if;
    end if;

    -- 5. Factură pe firmă (opțional): numele firmei și CUI-ul vin împreună
    v_company := nullif(trim(company_name), '');
    v_cui     := nullif(upper(regexp_replace(coalesce(company_cui, ''), '\s', '', 'g')), '');
    v_reg     := nullif(trim(company_reg_no), '');
    if (v_company is null) <> (v_cui is null) then
        raise exception 'Pentru factură pe firmă completează numele firmei și CUI-ul.';
    end if;
    if v_cui is not null and v_cui !~ '^(RO)?[0-9]{2,10}$' then
        raise exception 'CUI-ul nu este valid. Exemplu: RO12345678';
    end if;

    -- 6. Produsele: blocăm mărimile (for update), ca două comenzi simultane
    --    să nu vândă aceeași ultimă sticlă, și calculăm totalul DIN BAZA DE DATE
    for item in
        select v.price, v.stock, p.name, p.is_active, c.quantity,
               catalog.product_variants_size_label(v) as size_label
        from unnest(v_ids, v_qtys) as c(variant_id, quantity)
                 join catalog.product_variants v on v.id = c.variant_id
                 join catalog.products p on p.id = v.product_id
        order by v.id
            for update of v
        loop
            if not item.is_active then
                raise exception '„%” nu mai este disponibil.', item.name;
            end if;
            if item.stock < item.quantity then
                raise exception 'Stoc insuficient pentru „% – %”: în stoc sunt doar % buc.',
                    item.name, item.size_label, item.stock;
            end if;
            v_subtotal := v_subtotal + item.price * item.quantity;
            v_found := v_found + 1;
        end loop;

    if v_found <> cardinality(v_ids) then
        raise exception 'Unele produse din coș nu mai există. Reîncarcă pagina și încearcă din nou.';
    end if;

    -- 7. Livrarea: gratuită peste prag, dacă metoda are unul
    v_shipping := case
                      when delivery.free_over is not null and v_subtotal >= delivery.free_over then 0
                      else delivery.price
        end;

    -- 8. Comanda. Contul clientului (dacă e logat) vine din bilet
    insert into sales.orders (
        user_id, customer_name, email, phone,
        delivery_method_id, delivery_name, county, city, address, postal_code,
        company_name, company_cui, company_reg_no,
        payment_method_id, payment_name,
        subtotal, shipping_total, payment_fee, total, customer_note
    ) values (
                 nullif(current_setting('jwt.claims.user_id', true), '')::uuid,
                 v_name, v_email, v_phone,
                 delivery.id, delivery.name, v_county, v_city, v_address, v_postal,
                 v_company, v_cui, v_reg,
                 payment.id, payment.name,
                 v_subtotal, v_shipping, payment.fee, v_subtotal + v_shipping + payment.fee,
                 nullif(trim(place_order.customer_note), '')
             )
    returning * into new_order;

    -- 9. Produsele comenzii: copiem numele, mărimea și prețul de ACUM
    insert into sales.order_items (order_id, variant_id, product_name, size_label, unit_price, vat_rate, quantity)
    select new_order.id, v.id, p.name, catalog.product_variants_size_label(v), v.price, p.vat_rate, c.quantity
    from unnest(v_ids, v_qtys) as c(variant_id, quantity)
             join catalog.product_variants v on v.id = c.variant_id
             join catalog.products p on p.id = v.product_id;

    -- 10. Scădem stocul
    update catalog.product_variants v
    set stock = v.stock - c.quantity
    from unnest(v_ids, v_qtys) as c(variant_id, quantity)
    where v.id = c.variant_id;

    return new_order;
end;
$$;

-- Oricine poate plasa o comandă, și vizitatorii fără cont
grant execute on function sales.place_order to panos_anonymous;

-- ---------- Anularea: stocul revine, iar comanda nu mai poate fi redeschisă ----------
create function sales.restock_on_cancel()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
begin
    if old.status = 'cancelled' and new.status <> 'cancelled' then
        raise exception 'O comandă anulată nu mai poate fi redeschisă.';
    end if;

    if new.status = 'cancelled' and old.status <> 'cancelled' then
        update catalog.product_variants v
        set stock = v.stock + i.quantity
        from sales.order_items i
        where i.order_id = new.id and v.id = i.variant_id;
    end if;

    return new;
end;
$$;

create trigger orders_restock_on_cancel
    after update of status on sales.orders
    for each row execute function sales.restock_on_cancel();