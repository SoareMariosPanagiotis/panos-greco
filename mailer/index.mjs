// Poștașul: la fiecare câteva secunde ia mailurile din coadă și le trimite.
// Coada e tabelul sales.order_status_history (rândurile cu notified_at gol),
// dar poștașul nu-l atinge direct: folosește doar cele 3 funcții din schema mailer.

import pg from "pg";
import * as nodemailerModule from "nodemailer";
import { buildEmails } from "./templates.mjs";

// Merge și cu versiunile vechi, și cu cele noi ale bibliotecii
const nodemailer = nodemailerModule.default ?? nodemailerModule;

const {
    DATABASE_URL,
    SMTP_HOST = "localhost",
    SMTP_PORT = "1025",
    SMTP_USER,
    SMTP_PASSWORD,
    MAIL_FROM = "Panos Greco <office@panos-greco.com>",
    SHOP_EMAIL = "office@panos-greco.com",
    SITE_URL = "http://localhost:3000",
} = process.env;

const EVERY_MS = 5000; // o tură la 5 secunde

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });

const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // 465 = conexiune criptată (serverul din cPanel)
    // Mailpit nu cere parolă; serverul real va cere
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
});

const config = { from: MAIL_FROM, shopEmail: SHOP_EMAIL, siteUrl: SITE_URL };

// O tură: ia mailurile rezervate pentru noi, le trimite și pune ștampila
async function deliver() {
    const { rows } = await pool.query("select * from mailer.claim_notifications(10)");

    for (const row of rows) {
        const order = row.order_data;
        const emails = buildEmails(row.status, order, config);

        try {
            // Mailul pentru tine pleacă primul: dacă trebuie reîncercat,
            // doar tu ai putea primi un mail de două ori, niciodată clientul
            for (const email of emails) {
                await transport.sendMail(email);
            }
            await pool.query("select mailer.complete_notification($1)", [row.history_id]);
            console.log(`✓ #${order.order_number} (${row.status}): ${emails.length} mail(uri) trimise`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await pool.query("select mailer.fail_notification($1, $2)", [row.history_id, message]);
            console.error(`✗ #${order.order_number} (${row.status}): ${message}. Reîncerc mai târziu.`);
        }
    }
}

async function loop() {
    try {
        await deliver();
    } catch (error) {
        // De exemplu, baza de date nu răspunde: încercăm din nou la tura următoare
        console.error("Tura a eșuat:", error instanceof Error ? error.message : error);
    }
    setTimeout(loop, EVERY_MS);
}

console.log(`Poștașul a pornit: verifică coada la fiecare ${EVERY_MS / 1000} secunde.`);
loop();