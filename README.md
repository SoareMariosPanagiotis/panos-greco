# Panos Greco — magazin online

Magazinul online al firmei **PANOS GRECO S.R.L.**, care vinde ulei de măsline extravirgin bio din livada familiei
din Messinia (Grecia), cu magazin fizic în Galați. Proiectul îl folosesc și la facultate (CTI, anul 3: baze de
date, programare web) și va deveni baza unui ERP pentru stoc, magazin și depozit.

## Arhitectura

```
 Browser
    │  HTTP
    ▼
 Next.js 16 (web/)  ── server actions, pagini randate pe server
    │  GraphQL, cu JWT-ul utilizatorului
    ▼
 PostGraphile 4  ── API GraphQL generat direct din schema bazei
    │  SQL, cu rolul din JWT (anonim / client / admin)
    ▼
 PostgreSQL 17  ── tabele, Row Level Security, funcții, triggere
    ▲
    │  cozi în baza de date (outbox)
 Poștașul (mailer/)  ── emailuri și facturi PDF, prin SMTP (Mailpit în dezvoltare)
```

Toate serviciile, în afară de site, rulează în Docker Compose. Porturile lor sunt legate doar de `127.0.0.1`.

## Tehnologii

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Base UI)
- **API:** PostGraphile 4 (GraphQL), autentificare JWT
- **Bază de date:** PostgreSQL 17, migrații SQL versionate (`db/migrations/`)
- **Emailuri și PDF:** Node.js, Nodemailer, pdf-lib
- **Infrastructură:** Docker Compose, Mailpit pentru emailurile de test

## Ce face

- Catalog de produse cu variante, informații nutriționale și stoc
- Coș și comenzi, cu sau fără cont; livrare prin curier sau ridicare din magazin
- Conturi de client: adrese salvate, istoricul comenzilor, confirmarea emailului
- Panou de administrare pentru comenzi, facturi și stări
- Facturare cu numerotare fără goluri, stornare automată la anulare sau retur, facturi PDF pe email și pe site
- Anularea comenzii de către client până la emiterea AWB-ului; formular de retragere conform OUG 34/2014, modificată prin OUG 18/2026
- Emailuri tranzacționale prin coadă în baza de date (se reîncearcă singure dacă SMTP-ul pică)
- Backup și restaurare a bazei de date dintr-o singură comandă

## Decizii de design

- **Securitatea stă în baza de date, nu în site.** Fiecare cerere rulează în Postgres cu rolul utilizatorului:
  Row Level Security și drepturile pe tabele decid ce vede fiecare. Operațiile sensibile (înregistrare,
  plasarea comenzii, anulare, emiterea facturii) sunt funcții `security definer` cu `search_path` fixat.
- **Facturi fără goluri.** Rândul seriei se blochează la emitere (`for update`), deci două facturi emise în
  același timp nu pot primi același număr. O factură emisă nu se mai modifică, se corectează doar prin stornare.
- **Curse rezolvate în baza de date.** Când clientul anulează exact în timp ce adminul expediază, rândul comenzii
  e blocat și doar una dintre operații câștigă.
- **Outbox în loc de trimitere directă.** Emailurile se scriu întâi într-o coadă, în aceeași tranzacție cu
  comanda. Poștașul le ia cu `for update skip locked` și le reîncearcă la eroare, deci nu se pierde niciun email.
- **Migrații cu jurnal.** `web/scripts/migrate.mjs` ține evidența migrațiilor rulate (cu checksum) și le rulează
  automat la `npm run dev`.

## Cum îl pornești

Ai nevoie de Docker Desktop și Node.js 20 sau mai nou.

```bash
git clone https://github.com/SoareMariosPanagiotis/panos-greco.git
cd panos-greco

cp .env.example .env          # apoi pune parole proprii în .env
docker compose up -d          # Postgres, PostGraphile, Mailpit, poștașul

cd web
npm install
npm run dev                   # rulează migrațiile, apoi pornește site-ul
```

La prima pornire, migrațiile creează rolurile `panos_api` și `panos_mailer` fără parolă: parolele nu stau în git.
Le setezi o singură dată, cu aceleași valori ca în `.env`:

```bash
docker exec -it panos-db psql -U panos -d panos_greco
\password panos_api           # cere parola de două ori, fără s-o lase în istoricul terminalului
\password panos_mailer
\q
docker compose restart api mailer
```

- Site-ul: http://localhost:3000
- Emailurile de test (Mailpit): http://localhost:8025

Alte comenzi, din `web/`:

| Comandă | Ce face |
|---|---|
| `npm run db:migrate` | rulează migrațiile noi |
| `npm run db:status` | arată ce migrații au rulat |
| `npm run db:seed` | încarcă datele de pornire (produse, localități) |
| `npm run db:backup` | salvează baza în `backups/` |
| `npm run db:restore -- <fișier> --confirm` | pune înapoi o copie |

## Structura

```
db/migrations/   structura bazei: tabele, roluri, RLS, funcții (rulate în ordine)
db/seed/         datele de pornire
web/             site-ul Next.js (app/, components/, lib/) și scripturile pentru bază
mailer/          serviciul de emailuri și facturi PDF
docker-compose.yml
```

## Despre folosirea AI

Am construit proiectul împreună cu Claude (Anthropic), folosit ca profesor și ca partener de programare.
O mare parte din cod a fost scrisă cu ajutorul lui. Eu am decis arhitectura și regulile de business
(comenzi, facturare, retururi), am testat funcționalitățile și am revizuit fiecare schimbare înainte de commit.
Am urmărit să înțeleg de ce se face fiecare lucru, nu doar să-l obțin.

## Autor

Marios Panagiotis Soare — student CTI, Universitatea „Dunărea de Jos” din Galați
