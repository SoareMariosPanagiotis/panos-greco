// Descărcarea facturii în PDF (migrația 030), pentru ruta /factura/[id].
//
// Site-ul NU face PDF-ul: îl face poștașul, o singură dată, imediat după emitere, și îl păstrează
// baza de date. Aici doar îl cerem API-ului și îl dăm mai departe browserului. Tot baza de date
// hotărăște cine are voie: adminul, clientul conectat (comenzile lui) sau cine are linkul din mail.

import { gql } from "@/lib/catalog";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const query = `
  query InvoicePdf($invoiceId: UUID!, $receiptId: UUID) {
    invoicePdf(invoiceId: $invoiceId, receiptId: $receiptId)
  }
`;

// Ce întoarce baza de date: numele fișierului și PDF-ul ca text base64 (null = încă se face)
type PdfFile = { fileName: string; pdf: string | null };

// Poștașul face PDF-ul în cel mult câteva secunde de la emitere. Dacă cineva îl cere chiar atunci,
// mai întrebăm de câteva ori, la o secundă și jumătate, înainte să-i spunem să revină.
const TRIES = 6;
const PAUSE_MS = 1500;

async function fetchPdf(invoiceId: string, receiptId: string | null, token: string | null) {
    const variables = { invoiceId, receiptId };
    let data: { invoicePdf: string | null };
    try {
        data = await gql<{ invoicePdf: string | null }>(query, variables, token ?? undefined);
    } catch (error) {
        // Biletul din cookie a expirat: mai încercăm o dată ca vizitator, cu cheia din link
        if (!token) throw error;
        data = await gql<{ invoicePdf: string | null }>(query, variables);
    }
    return data.invoicePdf ? (JSON.parse(data.invoicePdf) as PdfFile) : null;
}

export async function invoicePdfResponse(invoiceId: string, receiptId: string | null, token: string | null) {
    // Ce vine din adresă trebuie să fie chiar un id; altfel nici nu mai întrebăm API-ul
    if (!UUID.test(invoiceId) || (receiptId !== null && !UUID.test(receiptId))) return notFound();

    try {
        for (let attempt = 1; attempt <= TRIES; attempt++) {
            const file = await fetchPdf(invoiceId, receiptId, token);
            if (!file) return notFound();
            if (file.pdf) return pdfFile(file.fileName, Buffer.from(file.pdf, "base64"));
            if (attempt < TRIES) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
        }
        return stillRendering();
    } catch {
        return unavailable();
    }
}

function pdfFile(fileName: string, bytes: Buffer) {
    const name = fileName.replace(/[^A-Za-z0-9._-]/g, ""); // „Factura-PGW-3002.pdf”, doar litere sigure
    return new Response(new Uint8Array(bytes), {
        headers: {
            "Content-Type": "application/pdf",
            // inline = browserul îl deschide în cititorul lui de PDF; de acolo se salvează sau se tipărește
            "Content-Disposition": `inline; filename="${name}"`,
            "Content-Length": String(bytes.length),
            // Factura are date personale: nu o păstrează nici browserul, nici vreun server de pe drum
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex, nofollow",
        },
    });
}

// ---------- Paginile scurte pentru când nu se poate ----------

function page(status: number, title: string, text: string, headers: Record<string, string> = {}) {
    // Pagina „se pregătește” se reîncarcă singură: o spunem și în HTML, nu doar în antetul Refresh
    const refresh = headers.Refresh ? `\n<meta http-equiv="refresh" content="${headers.Refresh}">` : "";
    const html = `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">${refresh}
<title>${title} · Panos Greco</title>
</head>
<body style="margin:0;padding:0 16px;background:#f4f5ec;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<main style="max-width:480px;margin:48px auto;padding:28px;background:#fff;border-radius:12px">
<h1 style="margin:0 0 12px;font-size:22px;color:#5a6b2e">${title}</h1>
<p style="margin:0 0 20px;line-height:1.6">${text}</p>
<p style="margin:0"><a href="/" style="color:#5a6b2e;font-weight:bold">Înapoi la magazin</a></p>
</main>
</body>
</html>`;
    return new Response(html, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...headers },
    });
}

// Nu există, linkul a expirat sau nu e al tău: același răspuns, ca să nu spunem care din ele
function notFound() {
    return page(
        404,
        "Factura nu e disponibilă",
        "Linkul a expirat (merge 30 de zile de la emiterea facturii) sau nu e complet. Factura e atașată " +
            "și la mailul primit de la noi. Dacă ai cont, o găsești oricând în „Contul meu”, la comandă.",
    );
}

// Abia emisă: poștașul încă face PDF-ul. Pagina se reîncarcă singură peste 5 secunde.
function stillRendering() {
    return page(
        503,
        "Factura se pregătește",
        "PDF-ul facturii se face chiar acum. Pagina se reîncarcă singură în câteva secunde.",
        { "Retry-After": "5", Refresh: "5" },
    );
}

// API-ul nu răspunde (de exemplu, containerele sunt oprite)
function unavailable() {
    return page(
        503,
        "Nu putem deschide factura acum",
        "Încearcă din nou peste un minut. Factura e atașată și la mailul primit de la noi.",
        { "Retry-After": "60" },
    );
}

export function tooManyRequests(message: string) {
    return page(429, "Prea multe cereri", message);
}
