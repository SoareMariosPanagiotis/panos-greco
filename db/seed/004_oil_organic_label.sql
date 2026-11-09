-- Datele bio ale uleiului, pentru o bază nouă (pe baza existentă le pune migrația 035): codul
-- organismului de control din certificatul DIO, GR-BIO-01, și țara unde sunt cultivate măslinele,
-- Grecia. Cu ele, pe pagina uleiului apare sigla bio a UE (web/components/organic-seal.tsx).
-- Nu suprascrie ce e deja completat în admin, cu o singură excepție: GR-BIO-03, codul de pe eticheta
-- cutiei de 3 l, care nu se potrivește cu certificatul.
update catalog.products
set organic_code = 'GR-BIO-01'
where slug = 'ulei-de-masline-extravirgin-bio'
  and (organic_code is null or organic_code = 'GR-BIO-03');

update catalog.products
set origin = 'Grecia'
where slug = 'ulei-de-masline-extravirgin-bio'
  and origin is null;
