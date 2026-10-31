-- 016: Intrarea în cont în doi pași, ca la eMAG, și numele separat de prenume.
--   Pasul 1: clientul scrie emailul, iar noi verificăm dacă are deja cont.
--   Pasul 2: dacă are, îi cerem parola; dacă nu, îi facem cont nou.

-- 1. Numele și prenumele în coloane separate.
--    La „Nume și prenume” unii scriu „Popescu Ion”, alții „Ion Popescu”:
--    dintr-un singur câmp nu putem ști sigur care e prenumele.
alter table auth.users
    add column first_name text check (first_name is null or char_length(first_name) between 1 and 50),
    add column last_name  text check (last_name  is null or char_length(last_name)  between 1 and 50);

-- Conturile de test făcute cu un singur câmp: primul cuvânt devine prenumele, restul numele
update auth.users
set first_name = split_part(btrim(full_name), ' ', 1),
    last_name  = nullif(btrim(substr(btrim(full_name), char_length(split_part(btrim(full_name), ' ', 1)) + 1)), '')
where full_name is not null;

alter table auth.users drop column full_name;

-- 2. Pasul 1 din formular: există deja un cont cu emailul ăsta?
create function auth.account_exists(email text)
    returns boolean
    language sql
    stable
    strict
    security definer
    set search_path = auth, public
as $$
select exists (
    select 1 from auth.users u where u.email = lower(btrim(account_exists.email))
);
$$;

grant execute on function auth.account_exists(text) to panos_anonymous;

-- 3. Înregistrarea primește acum prenumele și numele separat.
--    Funcția veche, cu un singur câmp pentru nume, dispare.
drop function auth.register(text, text, text);

create function auth.register(first_name text, last_name text, email text, password text)
    returns auth.jwt_token
    language plpgsql
    strict
    security definer
    set search_path = auth, public
as $$
declare
    clean_first text := btrim(register.first_name);
    clean_last  text := btrim(register.last_name);
    clean_email text := lower(btrim(register.email));
    new_id      uuid;
begin
    if char_length(clean_last) not between 1 and 50 then
        raise exception 'Completează numele.';
    end if;
    if char_length(clean_first) not between 1 and 50 then
        raise exception 'Completează prenumele.';
    end if;
    if char_length(clean_email) > 254 or clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'Adresa de email nu este validă.';
    end if;
    if char_length(register.password) < 8 then
        raise exception 'Parola trebuie să aibă cel puțin 8 caractere.';
    end if;
    -- bcrypt citește doar primii 72 de octeți din parolă; restul l-ar ignora în tăcere
    if octet_length(register.password) > 72 then
        raise exception 'Parola este prea lungă (cel mult 72 de caractere).';
    end if;

    -- Rolul e scris aici, de mână: 'client'. Nimeni nu-l poate schimba din site.
    insert into auth.users (email, password_hash, role, first_name, last_name)
    values (clean_email, crypt(register.password, gen_salt('bf', 10)), 'client', clean_first, clean_last)
    returning id into new_id;

    return (
        'panos_customer',
        new_id,
        extract(epoch from now() + interval '7 days')::bigint
    )::auth.jwt_token;
exception
    -- Emailul e deja folosit (coloana email e unique)
    when unique_violation then
        raise exception 'Există deja un cont cu acest email. Intră în cont cu el.';
end;
$$;

grant execute on function auth.register(text, text, text, text) to panos_anonymous;
