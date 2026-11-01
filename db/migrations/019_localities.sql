-- 019: Localitățile României, pentru lista „Localitate” din adrese.
-- Sursa: SIRUTA, nomenclatorul oficial al Institutului Național de Statistică.
-- Datele (13.755 de localități) vin separat: rulează apoi db/seed/002_localities.sql.

begin;

create table if not exists sales.localities (
    siruta   integer primary key, -- codul oficial al localității (INS)
    county   text    not null,    -- „Galați”, scris exact ca în lista de județe din site
    name     text    not null,    -- „Costi”
    label    text    not null,    -- „Costi (com. Vânători)”: ce vede clientul și ce ajunge în comandă
    is_urban boolean not null,    -- orașele și municipiile apar primele în listă
    -- În același județ pot fi două sate „Valea Mare”, dar în comune diferite,
    -- deci eticheta (cu comuna) trebuie să fie unică pe județ.
    -- Indexul creat de unique începe cu county: „toate localitățile din Galați” îl folosește direct.
    constraint localities_county_label_key unique (county, label)
);

-- Date publice: oricine le poate citi, nimeni nu le modifică prin API
grant select on sales.localities to panos_anonymous;
comment on table sales.localities is E'@omit create,update,delete';

commit;
