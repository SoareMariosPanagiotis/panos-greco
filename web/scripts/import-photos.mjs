// Încărcarea pozelor de produs dintr-un folder, după lista din photos-manifest.json (migrațiile 032–033).
//
//   npm run photos:import -- "<folder>" --dry-run   doar verifică (fișiere, produse, mărimi, poze), nu scrie nimic
//   npm run photos:import -- "<folder>"             încarcă pozele produselor care n-au încă nicio poză
//   npm run photos:import -- "<folder>" --replace   înlocuiește pozele produselor din listă (doar ale lor)
//
// <folder> = folderul din care pornesc căile din listă (la noi, „Foto banner” din iCloud).
//
// Fiecare poză trece prin aceeași curățare ca la încărcarea din admin (lib/product-photo.ts):
// întoarsă după EXIF, cel mult 2000 px, WebP, fără metadate. Apoi intră în bază prin
// catalog.add_product_image, care verifică încă o dată că e WebP și limita de 12 poze.
//
// Se conectează direct la Postgres, ca migrațiile, cu proprietarul bazei (din .env), deci ocolește
// API-ul și RLS. E o unealtă de administrare: o rulezi doar tu, de pe calculatorul tău.
// Fiecare produs e o tranzacție: dacă ceva pică la jumătate, produsul rămâne exact cum era.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const ENV_FILE = `${ROOT}.env`;
const MANIFEST = fileURLToPath(new URL("./photos-manifest.json", import.meta.url));

// Variabilele din .env (cele care există deja în mediu au întâietate), ca în migrate.mjs
if (existsSync(ENV_FILE)) {
    if (typeof process.loadEnvFile === "function") {
        process.loadEnvFile(ENV_FILE);
    } else {
        for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
            const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
            if (match && process.env[match[1]] === undefined) {
                process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
            }
        }
    }
}

function fail(message) {
    console.error(`✗ ${message}`);
    process.exit(1);
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

// „250 ml”, „1 l”, „200 g”, „2 kg” → mărimea din baza de date (ml sau g)
function parseSize(text) {
    const match = /^(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)$/i.exec(text.trim());
    if (!match) throw new Error(`mărime necunoscută: „${text}”`);
    const value = Number(match[1].replace(",", "."));
    const unit = match[2].toLowerCase();
    if (unit === "l") return { size: Math.round(value * 1000), unit: "ml" };
    if (unit === "kg") return { size: Math.round(value * 1000), unit: "g" };
    return { size: Math.round(value), unit };
}

// Aceeași curățare ca în lib/product-photo.ts
async function preparePhoto(path) {
    const { data, info } = await sharp(readFileSync(path), { failOn: "error", limitInputPixels: 60_000_000 })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const replace = args.includes("--replace");
const folder = args.find((arg) => !arg.startsWith("--"));
if (!folder) {
    fail('Spune-mi folderul cu poze. Exemplu: npm run photos:import -- "C:\\Users\\...\\Foto banner" --dry-run');
}
if (!existsSync(folder)) fail(`Nu găsesc folderul: ${folder}`);

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const client = new pg.Client({ connectionString: connectionString() });
try {
    await client.connect();
} catch (error) {
    fail(`Nu mă pot conecta la baza de date (${error.message}). Merg containerele? docker compose up -d`);
}

console.log(dryRun ? "Verificare (--dry-run): nu scriu nimic.\n" : replace ? "Import cu --replace.\n" : "Import.\n");
let photosDone = 0;
let productsDone = 0;
let skipped = 0;
let problems = 0;

for (const product of manifest.products) {
    const {
        rows: [row],
    } = await client.query("select id, name from catalog.products where slug = $1", [product.slug]);
    if (!row) {
        console.log(`✗ ${product.slug}: nu există în magazin`);
        problems++;
        continue;
    }

    // 1. Fișierele există? Mărimile există la produsul ăsta?
    const { rows: variants } = await client.query(
        "select id, pack_size, pack_unit from catalog.product_variants where product_id = $1",
        [row.id],
    );
    const photos = [];
    let broken = false;
    for (const photo of product.photos) {
        const path = join(folder, ...photo.file.split("/"));
        if (!existsSync(path)) {
            console.log(`✗ ${row.name}: lipsește fișierul „${photo.file}”`);
            broken = true;
            continue;
        }
        let variantId = null;
        if (photo.size) {
            const { size, unit } = parseSize(photo.size);
            const variant = variants.find((v) => v.pack_size === size && v.pack_unit === unit);
            if (!variant) {
                console.log(`✗ ${row.name}: nu are mărimea ${photo.size}`);
                broken = true;
                continue;
            }
            variantId = variant.id;
        }
        photos.push({ ...photo, path, variantId });
    }
    if (broken) {
        problems++;
        continue;
    }

    // 2. Are deja poze? Fără --replace nu le atingem
    const {
        rows: [{ count }],
    } = await client.query("select count(*)::int as count from catalog.product_images where product_id = $1", [
        row.id,
    ]);
    if (count > 0 && !replace) {
        console.log(`– ${row.name}: are deja ${count} poze, le las neatinse (cu --replace le înlocuiesc)`);
        skipped++;
        continue;
    }

    // 3. Pregătim toate pozele ÎNAINTE să scriem ceva: o poză stricată nu lasă o galerie pe jumătate
    let prepared;
    try {
        prepared = [];
        for (const photo of photos) prepared.push({ ...photo, ...(await preparePhoto(photo.path)) });
    } catch (error) {
        console.log(`✗ ${row.name}: nu am putut citi o poză (${error.message})`);
        problems++;
        continue;
    }
    const replacing = count > 0 ? ` (înlocuiesc ${count})` : "";
    if (dryRun) {
        console.log(`✓ ${row.name}: ${prepared.length} poze gata de încărcat${replacing}`);
        continue;
    }

    // 4. Scriem, într-o singură tranzacție pe produs
    try {
        await client.query("begin");
        if (count > 0) await client.query("delete from catalog.product_images where product_id = $1", [row.id]);
        for (const photo of prepared) {
            const {
                rows: [image],
            } = await client.query("select (catalog.add_product_image($1, $2, $3, $4, $5)).id as id", [
                row.id,
                photo.data.toString("base64"),
                photo.width,
                photo.height,
                photo.alt ?? null,
            ]);
            if (photo.variantId) {
                await client.query("update catalog.product_images set variant_id = $1 where id = $2", [
                    photo.variantId,
                    image.id,
                ]);
            }
        }
        await client.query("commit");
        console.log(`✓ ${row.name}: ${prepared.length} poze${replacing}`);
        photosDone += prepared.length;
        productsDone++;
    } catch (error) {
        await client.query("rollback");
        console.log(`✗ ${row.name}: ${error.message} (n-am schimbat nimic la produsul ăsta)`);
        problems++;
    }
}

await client.end();
console.log(
    dryRun
        ? `\nVerificare gata: NU am încărcat nimic. Probleme: ${problems}. Lăsate neatinse: ${skipped}.\n` +
          "Ca să le încarci pe site: aceeași comandă, cu --replace în loc de --dry-run."
        : `\nGata: ${photosDone} poze la ${productsDone} produse. Lăsate neatinse: ${skipped}. Probleme: ${problems}.`,
);
if (problems > 0) process.exitCode = 1;
