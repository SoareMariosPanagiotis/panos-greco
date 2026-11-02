-- 027: Frână la ghicirea parolelor.
-- După 5 parole greșite pentru aceeași adresă de email, intrarea în cont se blochează 15 minute.
-- Numărăm orice adresă încercată, chiar și una fără cont: așa blocarea nu trădează cine are cont
-- la noi. O intrare reușită șterge numărătoarea; la fel și o parolă nouă (din „Ai uitat parola?”
-- sau din cont), ca un client blocat să poată intra imediat.
-- Se poate rula de mai multe ori.

begin;

create table if not exists auth_private.login_attempts (
    email        text primary key,
    failures     integer not null default 0,
    last_failure timestamptz not null default now(),
    locked_until timestamptz
);

-- Login: verifică parola și întoarce biletul (sau nimic, dacă e greșită).
-- Aceeași semnătură ca în 007, deci drepturile rămân. Ca în 022, search_path are doar pg_catalog:
-- funcția rulează cu drepturile proprietarului, așa că scriem numele complete (auth., public.).
create or replace function auth.authenticate(email text, password text)
    returns auth.jwt_token
    language plpgsql
    strict
    security definer
    set search_path = pg_catalog, pg_temp
as $$
declare
    v_email   text := lower(btrim(authenticate.email));
    v_attempt auth_private.login_attempts;
    v_account auth.users;
    v_minutes integer;
begin
    select a.* into v_attempt
    from auth_private.login_attempts a
    where a.email = v_email;

    -- Blocat: refuzăm fără să mai verificăm parola. Eroarea anulează tranzacția, deci nu mai numărăm.
    if v_attempt.locked_until > now() then
        v_minutes := greatest(1, ceil(extract(epoch from v_attempt.locked_until - now()) / 60))::integer;
        raise exception 'Prea multe parole greșite. Încearcă din nou peste % sau alege „Ai uitat parola?”.',
            case when v_minutes = 1 then 'un minut' else v_minutes || ' minute' end;
    end if;

    select u.* into v_account
    from auth.users u
    where u.email = v_email;

    if v_account.id is not null
       and v_account.password_hash = public.crypt(authenticate.password, v_account.password_hash) then
        delete from auth_private.login_attempts a where a.email = v_email;
        return (
            case v_account.role when 'client' then 'panos_customer' else 'panos_admin' end,
            v_account.id,
            extract(epoch from now() + interval '7 days')::bigint
        )::auth.jwt_token;
    end if;

    -- Greșit: numărăm. Greșelile mai vechi de o oră nu se mai pun; rândurile de ieri le ștergem.
    delete from auth_private.login_attempts a where a.last_failure < now() - interval '1 day';

    insert into auth_private.login_attempts as a (email, failures, last_failure)
    values (v_email, 1, now())
    on conflict on constraint login_attempts_pkey do update
        set failures     = case when a.last_failure < now() - interval '1 hour' then 1 else a.failures + 1 end,
            last_failure = now(),
            locked_until = case
                               when (case when a.last_failure < now() - interval '1 hour' then 1 else a.failures + 1 end) >= 5
                                   then now() + interval '15 minutes'
                           end;
    return null;
end;
$$;

-- Parolă nouă: numărătoarea pentru adresa contului se șterge
create or replace function auth_private.clear_login_attempts()
    returns trigger
    language plpgsql
    security definer
    set search_path = pg_catalog, pg_temp
as $$
begin
    delete from auth_private.login_attempts a where a.email = new.email;
    return null;
end;
$$;

drop trigger if exists clear_login_attempts on auth.users;
create trigger clear_login_attempts
    after update of password_hash on auth.users
    for each row
    when (old.password_hash is distinct from new.password_hash)
    execute function auth_private.clear_login_attempts();

commit;
