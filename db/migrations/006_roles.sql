-- Rolurile aplicației ("pălăriile"). Nu se pot conecta singure.
create role panos_anonymous nologin;
create role panos_customer  nologin;
create role panos_admin     nologin;

-- Ierarhie: clientul moștenește drepturile vizitatorului, adminul pe ale clientului
grant panos_anonymous to panos_customer;
grant panos_customer  to panos_admin;

-- Utilizatorul cu care se conectează PostGraphile.
-- noinherit = nu are niciun drept până nu "pune o pălărie"
create role panos_api login noinherit;
grant panos_anonymous, panos_customer, panos_admin to panos_api;

-- Catalogul: oricine îl poate citi
grant usage  on schema catalog to panos_anonymous;
grant select on all tables in schema catalog to panos_anonymous;

-- Doar adminul îl poate modifica
grant insert, update, delete on all tables in schema catalog to panos_admin;

-- Tabelele create pe viitor în catalog primesc automat aceleași drepturi
alter default privileges in schema catalog grant select on tables to panos_anonymous;
alter default privileges in schema catalog grant insert, update, delete on tables to panos_admin;

-- Schema auth: deocamdată nimeni din API nu are acces (deci nici la parole)