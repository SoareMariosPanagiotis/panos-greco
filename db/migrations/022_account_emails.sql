-- 022: Parolă uitată, confirmarea emailului și schimbarea parolei.
--
-- Cum merge un link de unică folosință (resetare parolă sau confirmare email):
--   1. baza de date face un token lung, aleator (64 de caractere)
--   2. în tabel păstrăm doar AMPRENTA lui (sha256), nu tokenul.
--      Dacă cineva ar fura vreodată baza de date, n-ar putea folosi linkurile.
--   3. tokenul în clar stă doar până îl pune poștașul în mail, apoi îl ștergem
--   4. când clientul deschide linkul, calculăm amprenta și o căutăm în tabel
-- Se poate rula de mai multe ori.

begin;

-- ---------- 1. Emailul confirmat ----------

alter table auth.users
    add column if not exists email_verified_at timestamptz;

-- ---------- 2. Linkurile trimise pe mail ----------

-- Schema auth_private nu apare în API: nimeni nu ajunge la tabel din site
create table if not exists auth_private.email_tokens (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references auth.users (id) on delete cascade,
    purpose      text not null check (purpose in ('reset_password', 'verify_email')),
    email        text not null,        -- adresa la care a plecat linkul
    token_hash   text not null unique, -- amprenta sha256 a tokenului, în hex
    expires_at   timestamptz not null,
    used_at      timestamptz,          -- un link merge o singură dată
    -- Pentru poștaș: tokenul în clar, doar până pleacă mailul
    mail_token   text,
    sent_at      timestamptz,
    attempts     integer not null default 0,
    last_error   text,
    locked_until timestamptz,
    created_at   timestamptz not null default now()
);

create index if not exists email_tokens_user_idx on auth_private.email_tokens (user_id, purpose, created_at);
-- Index doar pe mailurile netrimise, ca poștașul să le găsească instant
create index if not exists email_tokens_pending_idx on auth_private.email_tokens (created_at)
    where mail_token is not null;

-- Amprenta unui token: aceeași funcție la emitere și la verificare
create or replace function auth_private.token_hash(token text)
    returns text
    language sql
    immutable
    strict
    set search_path = pg_catalog, pg_temp
as $$
select encode(sha256(convert_to(token, 'UTF8')), 'hex');
$$;

-- Emite un link nou și îl pune în coada poștașului.
-- Cel mult 3 linkuri de același fel pe oră: nimeni nu poate umple căsuța cuiva cu mailuri.
create or replace function auth_private.issue_token(target_user uuid, target_purpose text, valid_for interval)
    returns void
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_email text;
    v_token text;
begin
    select u.email into v_email from auth.users u where u.id = target_user;
    if v_email is null then
        return;
    end if;

    if (select count(*) from auth_private.email_tokens t
        where t.user_id = target_user
          and t.purpose = target_purpose
          and t.created_at > now() - interval '1 hour') >= 3 then
        return; -- prea multe cereri: tăcem, fără eroare
    end if;

    -- Doar ultimul link primit merge; cele vechi se anulează
    update auth_private.email_tokens t
    set used_at = now()
    where t.user_id = target_user
      and t.purpose = target_purpose
      and t.used_at is null;

    -- 32 de octeți aleatori = 64 de caractere hex: imposibil de ghicit
    v_token := encode(public.gen_random_bytes(32), 'hex');

    insert into auth_private.email_tokens (user_id, purpose, email, token_hash, expires_at, mail_token)
    values (target_user, target_purpose, v_email, auth_private.token_hash(v_token), now() + valid_for, v_token);
end;
$$;

-- Emailul e confirmat. Acum e sigur să mutăm în cont și comenzile plasate fără cont
-- cu aceeași adresă: am dovedit că adresa e chiar a lui. Întoarce câte comenzi a mutat.
create or replace function auth_private.mark_email_verified(target_user uuid)
    returns integer
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_user  auth.users;
    v_moved integer := 0;
begin
    update auth.users u
    set email_verified_at = coalesce(u.email_verified_at, now())
    where u.id = target_user
    returning u.* into v_user;

    if v_user.role = 'client' then
        update sales.orders o
        set user_id = v_user.id
        where o.user_id is null
          and lower(o.email) = v_user.email;
        get diagnostics v_moved = row_count;
    end if;

    return v_moved;
end;
$$;

-- La fiecare cont nou de client, pleacă singur mailul de confirmare
create or replace function auth_private.send_verification_on_signup()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
begin
    perform auth_private.issue_token(new.id, 'verify_email', interval '48 hours');
    return new;
end;
$$;

drop trigger if exists users_send_verification on auth.users;
create trigger users_send_verification
    after insert on auth.users
    for each row
    when (new.role = 'client' and new.email_verified_at is null)
    execute function auth_private.send_verification_on_signup();

-- ---------- 3. Ce poate face site-ul ----------

-- „Ai uitat parola?”: răspunsul e mereu același, fie că emailul are cont, fie că nu
create or replace function auth.request_password_reset(email text)
    returns void
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_user uuid;
begin
    select u.id into v_user from auth.users u where u.email = lower(btrim(request_password_reset.email));
    if v_user is not null then
        perform auth_private.issue_token(v_user, 'reset_password', interval '1 hour');
    end if;
end;
$$;

-- Parola nouă, din linkul primit pe mail. Întoarce biletul: clientul intră direct în cont.
create or replace function auth.reset_password(token text, new_password text)
    returns auth.jwt_token
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_token auth_private.email_tokens;
    v_user  auth.users;
begin
    if new_password is null or char_length(new_password) < 8 then
        raise exception 'Parola trebuie să aibă cel puțin 8 caractere.';
    end if;
    if octet_length(new_password) > 72 then
        raise exception 'Parola este prea lungă.';
    end if;

    select t.* into v_token
    from auth_private.email_tokens t
    where t.token_hash = auth_private.token_hash(reset_password.token)
      and t.purpose = 'reset_password'
    for update;

    if v_token.id is null or v_token.used_at is not null or v_token.expires_at < now() then
        raise exception 'Linkul nu mai este valid. Cere unul nou de la „Ai uitat parola?”.';
    end if;

    update auth_private.email_tokens t set used_at = now() where t.id = v_token.id;

    update auth.users u
    set password_hash = public.crypt(new_password, public.gen_salt('bf', 10))
    where u.id = v_token.user_id
      and u.email = v_token.email -- dacă între timp și-a schimbat emailul, linkul vechi nu mai merge
    returning u.* into v_user;

    if v_user.id is null then
        raise exception 'Linkul nu mai este valid. Cere unul nou de la „Ai uitat parola?”.';
    end if;

    -- A deschis linkul din mail, deci adresa e a lui: o considerăm confirmată
    perform auth_private.mark_email_verified(v_user.id);

    return (
        case v_user.role when 'client' then 'panos_customer' else 'panos_admin' end,
        v_user.id,
        extract(epoch from now() + interval '7 days')::bigint
    )::auth.jwt_token;
end;
$$;

-- Confirmarea emailului, din linkul primit pe mail. Merge și fără să fie intrat în cont.
create or replace function auth.verify_email(token text)
    returns integer
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_token auth_private.email_tokens;
begin
    select t.* into v_token
    from auth_private.email_tokens t
    where t.token_hash = auth_private.token_hash(verify_email.token)
      and t.purpose = 'verify_email'
    for update;

    if v_token.id is null or v_token.used_at is not null or v_token.expires_at < now()
        or not exists (select 1 from auth.users u where u.id = v_token.user_id and u.email = v_token.email) then
        raise exception 'Linkul nu mai este valid. Intră în cont și cere unul nou.';
    end if;

    update auth_private.email_tokens t set used_at = now() where t.id = v_token.id;
    return auth_private.mark_email_verified(v_token.user_id);
end;
$$;
-- În API, rezultatul se va numi linkedOrders (câte comenzi fără cont au intrat în cont)
comment on function auth.verify_email(text) is E'@resultFieldName linkedOrders';

-- „Trimite linkul de confirmare”, din contul clientului
create or replace function auth.request_email_verification()
    returns void
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_user uuid := nullif(current_setting('jwt.claims.user_id', true), '')::uuid;
begin
    if exists (select 1 from auth.users u where u.id = v_user and u.email_verified_at is null) then
        perform auth_private.issue_token(v_user, 'verify_email', interval '48 hours');
    end if;
end;
$$;

-- Schimbarea parolei din cont: cere și parola veche, ca un bilet furat să nu fie de ajuns
create or replace function auth.change_password(current_password text, new_password text)
    returns void
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_user auth.users;
begin
    select u.* into v_user
    from auth.users u
    where u.id = nullif(current_setting('jwt.claims.user_id', true), '')::uuid;

    if v_user.id is null then
        raise exception 'Intră în cont ca să îți schimbi parola.';
    end if;
    if current_password is null or v_user.password_hash <> public.crypt(current_password, v_user.password_hash) then
        raise exception 'Parola actuală nu este corectă.';
    end if;
    if new_password is null or char_length(new_password) < 8 then
        raise exception 'Parola nouă trebuie să aibă cel puțin 8 caractere.';
    end if;
    if octet_length(new_password) > 72 then
        raise exception 'Parola nouă este prea lungă.';
    end if;

    update auth.users u
    set password_hash = public.crypt(new_password, public.gen_salt('bf', 10))
    where u.id = v_user.id;
end;
$$;

-- ---------- 4. Poștașul ----------

-- Ia până la batch_size mailuri de cont de trimis și le rezervă 2 minute
create or replace function mailer.claim_account_emails(batch_size integer default 10)
    returns table (token_id uuid, purpose text, email text, first_name text, token text, attempts integer)
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
    with picked as (
        select t.id
        from auth_private.email_tokens t
        where t.mail_token is not null
          and t.sent_at is null
          and t.used_at is null
          and t.expires_at > now()
          and t.attempts < 8
          and (t.locked_until is null or t.locked_until < now())
        order by t.created_at
        limit batch_size
        for update skip locked
    ),
    claimed as (
        update auth_private.email_tokens t
        set locked_until = now() + interval '2 minutes'
        from picked
        where t.id = picked.id
        returning t.id, t.user_id, t.purpose, t.email, t.mail_token, t.attempts, t.created_at
    )
    select c.id, c.purpose, c.email, u.first_name, c.mail_token, c.attempts
    from claimed c
    join auth.users u on u.id = c.user_id
    order by c.created_at;
$$;

-- Mailul a plecat: ștergem tokenul în clar, rămâne doar amprenta
create or replace function mailer.complete_account_email(token_id uuid)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
update auth_private.email_tokens
set sent_at = now(), mail_token = null, locked_until = null, last_error = null
where id = token_id;
$$;

-- N-a mers: notăm eroarea și reîncercăm peste 1, 2, 3... minute
create or replace function mailer.fail_account_email(token_id uuid, error_message text)
    returns void
    language sql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
update auth_private.email_tokens
set attempts     = attempts + 1,
    last_error   = left(error_message, 500),
    locked_until = now() + make_interval(mins => attempts + 1)
where id = token_id;
$$;

-- ---------- 5. Cine ce are voie ----------

grant execute on function auth.request_password_reset(text) to panos_anonymous;
grant execute on function auth.reset_password(text, text) to panos_anonymous;
grant execute on function auth.verify_email(text) to panos_anonymous;
grant execute on function auth.request_email_verification() to panos_customer;
grant execute on function auth.change_password(text, text) to panos_customer;

grant execute on function mailer.claim_account_emails(integer) to panos_mailer;
grant execute on function mailer.complete_account_email(uuid) to panos_mailer;
grant execute on function mailer.fail_account_email(uuid, text) to panos_mailer;

commit;
