# Panos Greco — instrucțiuni pentru Claude

Magazinul online al firmei PANOS GRECO S.R.L. (ulei de măsline extravirgin bio din livada proprie din
Messinia, magazin în Galați). E și proiect de facultate (CTI, anul 3: baze de date, programare web) și,
mai târziu, baza unui ERP (stoc, magazin, depozit) și a unei aplicații mobile.

## Cum lucrăm

- Răspunde în română. Sunt student: explică „de ce”, nu doar „ce”, ca un profesor. Diagramele mă ajută.
- Pas cu pas, fără grabă. Înainte de schimbări mari (multe fișiere, migrații, ceva greu de întors), spune-mi
  planul și întreabă-mă.
- Când e ceva de învățat, lasă-mă să încerc întâi; dă-mi un indiciu, nu direct răspunsul.
- Comentariile din cod sunt în română, scurte, și explică de ce (vezi stilul din fișierele existente).
- Mesajele de commit sunt în engleză. Nu da commit și nu face push fără să-ți cer: le dau eu, după ce mă uit.
- Un commit = o temă. Propune-mi gruparea și mesajele.

## Reguli de siguranță (obligatorii)

- Nu deschide și nu citi niciodată `.env`. Parolele (bază de date, admin, poștaș, SMTP) nu apar în cod sau în chat.
  Parolele bazei de date au doar litere, cifre și underscore.
- Când arăți diferențe din `docker-compose.yml`, nu afișa liniile cu parole sau secrete.
- Înregistrarea creează mereu un client (`role = 'client'`); rolul nu vine niciodată din formular.
- O comandă fără cont se leagă de un cont doar după confirmarea emailului.
- Ștergi fișiere doar când le înlocuiești (oricum totul e în git).

## Arhitectura

- `docker-compose.yml`: `panos-db` (Postgres 17), `panos-api` (PostGraphile v4, `--watch`, schemele
  auth, catalog, sales), `panos-mail` (Mailpit, http://localhost:8025), `panos-mailer` (Node 22, folderul
  `mailer/`, trimite mailurile din cozile din baza de date). Porturile sunt legate doar de 127.0.0.1.
- `web/`: Next.js 16 (cacheComponents), React 19, Tailwind 4, shadcn pe Base UI, lucide-react, `cn`.
  Next.js 16 diferă de ce știi: citește întâi `web/AGENTS.md`.
- Site-ul vorbește cu baza de date doar prin GraphQL (`web/lib/catalog.ts`, funcția `gql`), cu biletul (JWT)
  utilizatorului; regulile de acces sunt în Postgres (RLS și funcții), nu în site.
- `mailer/`: Node ESM fără TypeScript. `templates.mjs` (HTML cu tabele și stiluri inline, pentru Gmail și
  Outlook), `invoice-pdf.mjs` + `pdf-font.mjs` (facturile PDF cu pdf-lib, fonturi Poppins micșorate).

## Baza de date

- Migrațiile sunt în `db/migrations/NNN_nume.sql` și rulează **doar** prin `npm run dev` sau
  `npm run db:migrate` (`web/scripts/migrate.mjs`, jurnalul `public.schema_migrations`). Nu rula fișiere
  `.sql` de mână din WebStorm: baza se schimbă, dar jurnalul nu află (am pățit-o cu 029 și 030).
- O migrație rulată nu se mai modifică: faci una nouă. Fiecare migrație trebuie să se poată rula de două ori
  (`if not exists`, `create or replace`, `drop ... if exists` înainte de `create trigger`/`policy`).
- Rolurile: `panos_anonymous` ⊂ `panos_customer` ⊂ `panos_admin`; `panos_api` (conexiunea PostGraphile);
  `panos_mailer` (doar funcțiile din schema `mailer`).
- Funcțiile `security definer` au `set search_path = pg_catalog, pg_temp`. Drepturile implicite iau
  `execute` de la public, deci fiecare funcție nouă are nevoie de `grant execute` explicit.
- Convenții PostGraphile: `sales.tabel_camp(t sales.tabel)` devine câmpul `camp`; o funcție care întoarce un
  tabel are în rezultat câmpul cu numele tabelului (sau `@resultFieldName`); `jsonb` vine ca text
  (`JSON.parse`); funcțiile `stable` sunt query, celelalte mutation.
- În plpgsql, un argument cu același nume ca o coloană strică `on conflict (coloana)`: folosește
  `on conflict on constraint <nume>`.
- Lecția din 026: clientul nu citește prin relații tabele cu coloane sensibile (PostGraphile face `select *`);
  îi dăm un câmp calculat cu JSON-ul de care are nevoie.

## Facturarea și comenzile (migrațiile 028–031)

- Seria PGW, de la 3000, numerotare fără goluri (rândul seriei se blochează la emitere). Factura emisă nu se
  mai schimbă; corecțiile se fac doar prin stornare.
- TVA-ul se calculează din prețurile cu TVA; transportul urmează cota produselor (de confirmat cu contabilul).
- Anularea unei comenzi cu factură emisă o stornează automat; returul primit stornează doar produsele returnate.
- PDF-ul îl face poștașul o singură dată și îl arhivează în `sales.invoice_documents`; site-ul îl servește din
  `/factura/[id]`, iar mailul atașează exact același fișier.
- Clientul își anulează singur comanda până se pune AWB-ul (031); după, o refuză la livrare sau o returnează.
  Formularul de retur (OUG 18/2026) rămâne mereu accesibil.

## Fișiere

- Fișierele din proiect au final de rând CRLF, în afară de `web/next.config.ts`, `web/package.json`,
  `web/AGENTS.md` și `docker-compose.yml` (LF). Păstrează finalul de rând și linia goală de la sfârșit, cum sunt.

## Înainte să spui „gata”

- În `web/`: `npx tsc --noEmit` și `npx eslint <fișierele schimbate>`. În `mailer/`: `node --check <fișier>`.
- Migrațiile: rulează-le prin `npm run db:migrate` și verifică cu `npm run db:status`; testează pe comenzi de test.
- Mailurile se văd în Mailpit. După schimbări în `mailer/`: `docker compose restart mailer` și
  `docker compose logs -f mailer`.
- Backup înainte de ceva riscant: `npm run db:backup`.

## Ce urmează

1. e-Factura, etapa 2: XML UBL (CIUS-RO), legarea cu ANAF (OAuth), trimiterea în SPV după confirmarea mea.
2. Lansarea: server, domeniu, HTTPS, mail real (SPF, DKIM), parole noi, backup automat, texte legale citite de jurist.
3. Plata cu cardul, cu rambursări. 4. Coduri de reducere și fidelitate. 5. Curier (AWB din admin). 6. Designul.
Mai târziu: ERP și aplicația mobilă.

Întrebări deschise pentru contabil: păstrăm seria PGW, TVA-ul la transport, trimitem facturile B2C în SPV?
