-- Extensia care știe să cripteze parole (bcrypt)
create extension if not exists pgcrypto;

-- Schemă privată: ce e aici nu ajunge niciodată în API
create schema auth_private;

-- Amprenta parolei dispare complet din API, pentru oricine
comment on column auth.users.password_hash is E'@omit';

-- Biletul de acces: ce rol ai, cine ești, când expiră
create type auth.jwt_token as (
                                  role    text,
                                  user_id uuid,
                                  exp     bigint
                              );

-- De acum, funcțiile noi NU mai pot fi apelate de oricine în mod implicit
alter default privileges revoke execute on functions from public;

-- Creare cont (doar din consolă, nu din API: stă în auth_private)
create function auth_private.create_user(email text, password text, role text default 'client')
    returns uuid
    language sql
    security definer
    set search_path = auth, public
as $$
insert into auth.users (email, password_hash, role)
values (lower(create_user.email), crypt(create_user.password, gen_salt('bf')), create_user.role)
returning id;
$$;

-- Login: verifică parola și întoarce biletul (sau nimic, dacă e greșită)
create function auth.authenticate(email text, password text)
    returns auth.jwt_token
    language plpgsql
    strict
    security definer
    set search_path = auth, public
as $$
declare
    account auth.users;
begin
    select u.* into account
    from auth.users u
    where u.email = lower(authenticate.email);

    if account.password_hash = crypt(password, account.password_hash) then
        return (
                case account.role when 'client' then 'panos_customer' else 'panos_admin' end,
                account.id,
                extract(epoch from now() + interval '7 days')::bigint
            )::auth.jwt_token;
    end if;

    return null;
end;
$$;

-- "Cine sunt eu?", citit din bilet
create function auth.me()
    returns auth.users
    language sql
    stable
    security definer
    set search_path = auth, public
as $$
select * from auth.users
where id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid;
$$;

-- Cine ce are voie
grant usage on schema auth to panos_anonymous;
grant execute on function auth.authenticate(text, text) to panos_anonymous;
grant execute on function auth.me() to panos_customer;
grant select on auth.users to panos_admin;