// Migrațiile automate.
// Rulează în ordine fișierele din db/migrations care n-au rulat încă și notează fiecare
// în tabelul public.schema_migrations (numele, amprenta fișierului și data).
//
//   npm run db:migrate             rulează ce lipsește (pornește singur înainte de „npm run dev” și „npm start”)
//   npm run db:status              arată ce a rulat și ce urmează
//   npm run db:baseline -- 026     o singură dată, pe baza de acum: notează că 001–026 au rulat de mână
//   npm run db:seed                datele de pornire (db/seed), fiecare fișier o singură dată
//
// Conexiunea: DATABASE_URL, sau POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB din .env-ul
// din rădăcina proiectului, la localhost:5432 (portul containerului panos-db).

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const ENV_FILE = `${ROOT}.env`;
const FOLDERS = { migrations: `${ROOT}db/migrations`, seed: `${ROOT}db/seed` };

// Variabilele din .env (cele care există deja în mediu au întâietate)
if (existsSync(ENV_FILE)) {
    if (typeof process.loadEnvFile === "function") {
        process.loadEnvFile(ENV_FILE);
    } else {
        // Node mai vechi de 20.12: citim noi rândurile NUME=valoare
        for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
            const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
            if (match && process.env[match[1]] === undefined) {
                process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
            }
        }
    }
}

function connectionString() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT = "5432" } = process.env;
    if (!POSTGRES_USER || !POSTGRES_DB) {
        fail("Nu găsesc datele de conectare: lipsesc POSTGRES_USER și POSTGRES_DB din .env (sau DATABASE_URL).");
    }
    const password = POSTGRES_PASSWORD ? `:${encodeURIComponent(POSTGRES_PASSWORD)}` : "";
    return `postgres://${encodeURIComponent(POSTGRES_USER)}${password}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`;
}

function fail(message) {
    console.error(`✗ ${message}`);
    process.exit(1);
}

// Fișierele unui folder, în ordinea numerelor: 001_..., 002_...
function files(kind) {
    return readdirSync(FOLDERS[kind])
        .filter((name) => /^\d{3}_.+\.sql$/.test(name))
        .sort()
        .map((name) => {
            // Fără \r: aceeași amprentă pe Windows (CRLF) și pe server (LF)
            const sql = readFileSync(`${FOLDERS[kind]}/${name}`, "utf8").replace(/\r\n/g, "\n");
            return {
                id: `${kind}/${name}`,
                name,
                number: name.slice(0, 3),
                sql,
                checksum: createHash("sha256").update(sql).digest("hex"),
            };
        });
}

const JOURNAL = `
  create table if not exists public.schema_migrations (
      name       text primary key,                 -- ex: migrations/027_login_throttle.sql
      checksum   text not null,                    -- amprenta sha256 a fișierului
      applied_at timestamptz not null default now()
  )
`;

async function journal(client) {
    await client.query(JOURNAL);
    const { rows } = await client.query("select name, checksum from public.schema_migrations");
    return new Map(rows.map((row) => [row.name, row.checksum]));
}

async function record(client, file) {
    await client.query("insert into public.schema_migrations (name, checksum) values ($1, $2)", [file.id, file.checksum]);
}

// Un fișier: dacă își face singur tranzacția (begin; ... commit;), îl lăsăm așa;
// altfel îl punem noi într-o tranzacție, ca să ruleze tot sau nimic
async function apply(client, file) {
    const started = Date.now();
    // „begin;” cu punct și virgulă: „begin” fără el e începutul unei funcții plpgsql, nu o tranzacție
    const ownTransaction = /^\s*(begin\s*;|begin\s+transaction|start\s+transaction|commit\s*;)/im.test(file.sql);
    try {
        if (ownTransaction) {
            await client.query(file.sql);
            await record(client, file);
        } else {
            await client.query("begin");
            await client.query(file.sql);
            await record(client, file);
            await client.query("commit");
        }
    } catch (error) {
        await client.query("rollback").catch(() => {});
        fail(`${file.id} a eșuat: ${error.message}\n  Nimic din fișierul ăsta nu a fost salvat. Repară-l și rulează din nou.`);
    }
    console.log(`✓ ${file.id} (${((Date.now() - started) / 1000).toFixed(1)} s)`);
}

// Avertisment pentru migrațiile modificate după ce au rulat: nu se mai editează, se face una nouă
function warnChanged(kind, applied) {
    for (const file of files(kind)) {
        const checksum = applied.get(file.id);
        if (checksum && checksum !== file.checksum) {
            console.warn(`⚠ ${file.id} s-a schimbat după ce a rulat. O migrație rulată nu se modifică: fă una nouă.`);
        }
    }
}

async function migrate(client, kind) {
    const applied = await journal(client);

    // Baza are deja tabele, dar jurnalul e gol: migrațiile au rulat de mână, înainte de acest script
    if (applied.size === 0) {
        const { rows } = await client.query("select to_regclass('auth.users') is not null as has_tables");
        if (rows[0].has_tables) {
            fail(
                "Baza de date are deja tabele, dar jurnalul migrațiilor e gol.\n" +
                    "  Dacă ai rulat de mână migrațiile până la 026 inclusiv, scrie o singură dată:\n" +
                    "  npm run db:baseline -- 026",
            );
        }
    }

    warnChanged(kind, applied);
    const pending = files(kind).filter((file) => !applied.has(file.id));
    if (pending.length === 0) {
        console.log(kind === "seed" ? "Datele de pornire sunt deja încărcate." : "Baza de date e la zi.");
        return;
    }
    for (const file of pending) await apply(client, file);
}

async function status(client) {
    const applied = await journal(client);
    for (const kind of ["migrations", "seed"]) {
        for (const file of files(kind)) {
            console.log(`${applied.has(file.id) ? "✓ rulat   " : "· urmează "} ${file.id}`);
        }
    }
    warnChanged("migrations", applied);
}

// O singură dată: marchează ca rulate migrațiile 001..upTo și toate datele de pornire, fără să le ruleze
async function baseline(client, upTo) {
    if (!/^\d{3}$/.test(upTo ?? "")) {
        fail("Spune până la ce migrație ai rulat de mână, cu 3 cifre. Exemplu: npm run db:baseline -- 026");
    }
    const applied = await journal(client);
    if (applied.size > 0) fail("Jurnalul migrațiilor nu e gol: baseline se face o singură dată, la început.");

    const marked = [...files("migrations").filter((file) => file.number <= upTo), ...files("seed")];
    await client.query("begin");
    for (const file of marked) await record(client, file);
    await client.query("commit");
    console.log(`✓ Am notat ${marked.length} fișiere ca rulate (migrațiile 001–${upTo} și datele de pornire).`);
    console.log("  De acum: npm run db:migrate rulează doar ce e nou.");
}

const [command = "migrate", argument] = process.argv.slice(2);
const client = new pg.Client({ connectionString: connectionString() });

try {
    await client.connect();
} catch (error) {
    fail(
        `Nu mă pot conecta la baza de date (${error.message}).\n` +
            "  Pornește containerele: docker compose up -d",
    );
}

try {
    // Mesajele de tip NOTICE („already exists, skipping”) nu ne interesează aici
    await client.query("set client_min_messages = warning");
    // Două porniri deodată (de exemplu două terminale cu npm run dev) nu rulează aceeași migrație
    // de două ori: a doua așteaptă aici până termină prima. Se eliberează singur la deconectare.
    await client.query("select pg_advisory_lock(hashtext('panos-greco:migrations'))");
    if (command === "migrate") await migrate(client, "migrations");
    else if (command === "seed") await migrate(client, "seed");
    else if (command === "status") await status(client);
    else if (command === "baseline") await baseline(client, argument);
    else fail(`Comandă necunoscută: ${command}. Merg: migrate, status, baseline, seed.`);
} finally {
    await client.end();
}
