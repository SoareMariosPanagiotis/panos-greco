-- 021: Codurile poștale, ca să le completăm singuri în adresă.
--   - La sate și orașele mici, localitatea are UN singur cod: îl ținem chiar în sales.localities.
--   - În orașele mari și în București, codul depinde de stradă și de număr: tabel separat.
-- Datele vin din db/seed/002_localities.sql și db/seed/003_street_postal_codes.sql (rulează-le după).
-- Se poate rula de mai multe ori.

begin;

-- 1. Codul localității. null = oraș mare, unde codul se caută după stradă.
alter table sales.localities
    add column if not exists postal_code text;

alter table sales.localities drop constraint if exists localities_postal_code_check;
alter table sales.localities add constraint localities_postal_code_check
    check (postal_code ~ '^[0-9]{6}$');

-- 2. Codurile pe străzi. Un rând = o porțiune de stradă cu codul ei.
create table if not exists sales.street_postal_codes (
    id           integer generated always as identity primary key,
    siruta       integer not null references sales.localities (siruta),
    street_type  text    not null, -- „strada”, „bulevard”, „alee”... (fără diacritice)
    street_words text[]  not null, -- cuvintele din nume, fără titluri: „Mincu Ion, arh.” → {ion,mincu}
    numbers      text,             -- „nr. 1-13” sau „nr. 15; 2-44”; null = toată strada are același cod
    postal_code  text    not null check (postal_code ~ '^[0-9]{6}$')
);

-- Căutăm mereu într-un singur oraș: indexul pe siruta ne duce direct la străzile lui
create index if not exists street_postal_codes_siruta_idx on sales.street_postal_codes (siruta);

grant select on sales.street_postal_codes to panos_anonymous;
-- În API nu apar nici lista întreagă, nici ușile de modificare: doar funcția de mai jos
comment on table sales.street_postal_codes is E'@omit create,update,delete,all';

-- 3. Străzile din oraș al căror nume apare întreg în adresa scrisă de client.
--    <@ înseamnă „e conținut în”: {brailei} <@ {str,brailei,10} → adevărat.
--    Așa nu contează ordinea: „Ion Mincu” și „Mincu Ion” au aceleași cuvinte.
create or replace function sales.street_codes(locality_siruta integer, address_words text[])
    returns setof sales.street_postal_codes
    language sql
    stable
as $$
select s.*
from sales.street_postal_codes s
where s.siruta = locality_siruta
  and s.street_words <@ address_words;
$$;

grant execute on function sales.street_codes(integer, text[]) to panos_anonymous;

commit;
