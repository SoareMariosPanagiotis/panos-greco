-- 035: Datele bio ale uleiului, ca pe pagina lui să apară sigla bio a UE.
-- Sigla apare doar când produsul are codul organismului de control și țara (web/components/organic-seal.tsx).
-- Le luăm din certificatul DIO (web/lib/organic-certificate.ts): GR-BIO-01, măsline cultivate în Grecia.
--
-- E o migrație de date, nu de structură. Pe baza de acum rulează singură, cu „npm run dev”.
-- Pe o bază nouă, produsele încă nu există când rulează migrațiile: acolo le pune seed-ul 004.
-- Nu suprascrie ce e deja completat în admin, cu o excepție: GR-BIO-03, codul de pe eticheta cutiei
-- de 3 l, care nu se potrivește cu certificatul.
-- Se poate rula de mai multe ori.

update catalog.products
set organic_code = 'GR-BIO-01'
where slug = 'ulei-de-masline-extravirgin-bio'
  and (organic_code is null or organic_code = 'GR-BIO-03');

update catalog.products
set origin = 'Grecia'
where slug = 'ulei-de-masline-extravirgin-bio'
  and origin is null;
