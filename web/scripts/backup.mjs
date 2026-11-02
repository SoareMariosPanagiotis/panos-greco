// Copia de siguranță a bazei de date.
//
//   npm run db:backup                         salvează toată baza în backups/panos-<data>-<ora>.dump
//   npm run db:restore -- <fișier> --confirm  pune înapoi o copie. ȘTERGE ce e acum în bază!
//                                             (înainte, face singur o copie a stării de acum)
//
// La restaurare, tot ce e în copie revine exact cum era, inclusiv jurnalul migrațiilor. Dacă după
// copie a rulat o migrație nouă, tabelele ei rămân, iar npm run db:migrate o rulează din nou
// (migrațiile noastre se pot rula de mai multe ori).
//
// Copia o face chiar containerul panos-db, cu pg_dump-ul lui (aceeași versiune ca serverul),
// deci nu ai nevoie de Postgres instalat pe calculator și nici de parola bazei.
// Copiile conțin datele clienților: folderul backups/ nu intră în git, iar copiile se țin
// doar în locuri sigure.

import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BACKUPS = resolve(ROOT, "backups");
const CONTAINER = "panos-db";

// Comenzile rulează în container, unde POSTGRES_USER și POSTGRES_DB există deja
const DUMP = 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom';
const RESTORE = 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --single-transaction';

function fail(message) {
    console.error(`✗ ${message}`);
    process.exit(1);
}

// Rulează o comandă și așteaptă să termine. stdin/stdout pot fi legate la fișiere.
function run(command, args, { input, output } = {}) {
    return new Promise((done, failed) => {
        const child = spawn(command, args, { cwd: ROOT, stdio: [input ? "pipe" : "ignore", output ? "pipe" : "ignore", "pipe"] });
        let errors = "";
        child.stderr.on("data", (chunk) => (errors += chunk));
        child.on("error", failed); // de exemplu: docker nu e instalat sau nu e în PATH

        const written = output ? new Promise((finished) => output.on("finish", finished)) : Promise.resolve();
        if (output) child.stdout.pipe(output);
        if (input) input.pipe(child.stdin);

        child.on("close", async (code) => {
            await written;
            done({ code, errors: errors.trim() });
        });
    });
}

function explain(errors) {
    if (/no such container|is not running/i.test(errors)) {
        return `Containerul ${CONTAINER} nu merge. Pornește-l: docker compose up -d`;
    }
    if (/cannot connect to the docker daemon|error during connect|pipe.*docker/i.test(errors)) {
        return "Docker nu răspunde. Pornește Docker Desktop și încearcă din nou.";
    }
    return errors || "Eroare necunoscută.";
}

// „2026-11-01 15:30:12”, ora României → „2026-11-01-153012”
function stamp() {
    return new Date().toLocaleString("sv-SE", { timeZone: "Europe/Bucharest" }).replace(" ", "-").replaceAll(":", "");
}

function size(bytes) {
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

async function backup(label = "") {
    mkdirSync(BACKUPS, { recursive: true });
    const file = resolve(BACKUPS, `panos-${stamp()}${label}.dump`);
    const output = createWriteStream(file, { flags: "wx" }); // nu suprascrie niciodată o copie

    let result;
    try {
        result = await run("docker", ["exec", CONTAINER, "sh", "-c", DUMP], { output });
    } catch (error) {
        rmSync(file, { force: true });
        fail(`Nu pot porni docker (${error.message}). E instalat și pornit Docker Desktop?`);
    }
    if (result.code !== 0) {
        rmSync(file, { force: true });
        fail(`Copia nu s-a putut face. ${explain(result.errors)}`);
    }

    console.log(`✓ Copia e gata: backups/${basename(file)} (${size(statSync(file).size)})`);
    return file;
}

// Fișierul cerut: o cale (de oriunde) sau doar numele unei copii din backups/
function findBackup(name) {
    for (const candidate of [resolve(process.cwd(), name), resolve(ROOT, name), resolve(BACKUPS, name)]) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    const recent = existsSync(BACKUPS)
        ? readdirSync(BACKUPS).filter((entry) => entry.endsWith(".dump")).sort().slice(-5)
        : [];
    fail(
        `Nu găsesc copia „${name}”.` +
            (recent.length ? `\n  Ultimele copii din backups/:\n${recent.map((entry) => `    ${entry}`).join("\n")}` : ""),
    );
}

async function restore(name, confirmed) {
    if (!name) {
        fail("Spune ce copie pun înapoi. Exemplu: npm run db:restore -- panos-2026-11-01-153012.dump --confirm");
    }
    const file = findBackup(name);
    if (!confirmed) {
        fail(
            `Asta înlocuiește TOT ce e acum în bază cu copia ${basename(file)}.\n` +
                "  Dacă ești sigur, adaugă --confirm la sfârșitul comenzii.",
        );
    }

    // Plasă de siguranță: dacă ai ales copia greșită, starea de acum rămâne salvată
    await backup("-inainte-de-restaurare");

    // Cât punem copia înapoi, API-ul și poștașul stau: nu vrem comenzi noi în timpul ăsta
    await run("docker", ["compose", "stop", "api", "mailer"]);
    const result = await run("docker", ["exec", "-i", CONTAINER, "sh", "-c", RESTORE], {
        input: createReadStream(file),
    });
    await run("docker", ["compose", "start", "api", "mailer"]);

    if (result.code !== 0) {
        // --single-transaction: la orice eroare nu se schimbă nimic
        fail(`Copia nu a fost pusă înapoi; baza a rămas cum era. ${explain(result.errors)}`);
    }
    console.log(`✓ Baza de date e acum cea din ${basename(file)}.`);
}

const [command = "backup", ...rest] = process.argv.slice(2);
if (command === "backup") await backup();
else if (command === "restore") await restore(rest.find((arg) => arg !== "--confirm"), rest.includes("--confirm"));
else fail(`Comandă necunoscută: ${command}. Merg: backup, restore.`);
