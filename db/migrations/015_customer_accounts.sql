-- 015: Conturi pentru clienți.
-- Oricine își poate face cont din site, dar NUMAI cont de client:
-- rolul nu vine niciodată din formular, îl scrie funcția.

-- Numele clientului. Adminul creat din consolă nu are nume, deci poate lipsi.
alter table auth.users
    add column full_name text
        check (full_name is null or char_length(full_name) between 2 and 100);

-- Înregistrare: creează contul și întoarce direct biletul,
-- ca și cum clientul s-ar fi logat imediat după.
create function auth.register(full_name text, email text, password text)
    returns auth.jwt_token
    language plpgsql
    strict
    security definer
    set search_path = auth, public
as $$
declare
clean_name  text := btrim(register.full_name);
    clean_email text := lower(btrim(register.email));
    new_id      uuid;
begin
    if char_length(clean_name) not between 2 and 100 then
        raise exception 'Completează numele și prenumele.';
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
insert into auth.users (email, password_hash, role, full_name)
values (clean_email, crypt(register.password, gen_salt('bf', 10)), 'client', clean_name)
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

-- Vizitatorii (încă neconectați) își pot face cont
grant execute on function auth.register(text, text, text) to panos_anonymous;

-- Parole mai greu de spart și pentru conturile create din consolă.
-- Costul 10 = de 16 ori mai multă muncă decât implicitul (6), pentru oricine
-- ar încerca să ghicească parola dintr-o amprentă furată.
create or replace function auth_private.create_user(email text, password text, role text default 'client')
    returns uuid
    language sql
    security definer
    set search_path = auth, public
as $$
insert into auth.users (email, password_hash, role)
values (lower(create_user.email), crypt(create_user.password, gen_salt('bf', 10)), create_user.role)
returning id;
$$;