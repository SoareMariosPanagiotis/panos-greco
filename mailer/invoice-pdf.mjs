// Factura ca PDF. Poștașul o face o singură dată, după emitere, și o arhivează în baza de date
// (migrația 030): de acolo pleacă atașată la mail și tot de acolo o descarcă clientul de pe site.
// Arată la fel ca factura din admin (componenta InvoiceDocument din site): furnizor și titlu sus,
// cumpărătorul, tabelul cu rânduri, totalurile.
// Coordonatele din PDF pornesc din colțul de JOS-stânga, în puncte (1 pt = 1/72 inch).

import { readFile } from "node:fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import { trueTypeFontkit } from "./pdf-font.mjs";

const PAGE = { width: 595.28, height: 841.89 }; // A4
const MARGIN = 40;
const BOTTOM = 56; // sub linia asta stă doar subsolul paginii
const RIGHT = PAGE.width - MARGIN;
const WIDTH = RIGHT - MARGIN;

const OLIVE = rgb(0x5a / 255, 0x6b / 255, 0x2e / 255); // aceeași culoare ca pe site
const TEXT = rgb(0.12, 0.16, 0.22);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.88, 0.89, 0.9);
const HEAD_BG = rgb(0.96, 0.96, 0.95);

// Coloanele tabelului: lățimea fiecăreia; „Denumirea” ia ce rămâne
const COLUMNS = [
    { key: "no", label: ["Nr."], width: 22 },
    { key: "description", label: ["Denumirea produselor"], width: 0 },
    { key: "unit", label: ["U.M."], width: 30 },
    { key: "quantity", label: ["Cant."], width: 34, right: true },
    { key: "price", label: ["Preț unitar", "fără TVA"], width: 64, right: true },
    { key: "net", label: ["Valoare", "fără TVA"], width: 64, right: true },
    { key: "rate", label: ["TVA"], width: 30, right: true },
    { key: "vat", label: ["Valoare", "TVA"], width: 56, right: true },
];
COLUMNS[1].width = WIDTH - COLUMNS.reduce((sum, column) => sum + column.width, 0);

// Fonturile și sigla se citesc o singură dată, la prima factură
let assets = null;
async function loadAssets() {
    if (!assets) {
        const file = (name) => readFile(new URL(name, import.meta.url));
        const [regular, bold, logo] = await Promise.all([
            file("./fonts/Poppins-Regular.ttf"),
            file("./fonts/Poppins-Bold.ttf"),
            file("./assets/logo.png"),
        ]);
        // Fontul citit și de noi, ca să știm ce litere are (vezi printable mai jos)
        assets = { regular, bold, logo, coverage: trueTypeFontkit.create(regular) };
    }
    return assets;
}

// ---------- Literele pe care fontul nu le are ----------
// Fontul are toate literele scrise cu alfabetul latin (și ă, â, î, ș, ț), dar nu și pe cele grecești
// sau chirilice. Un nume scris „Γιώργος” ar ieși în PDF ca niște pătrățele goale, așa că îl scriem
// cu litere latinești („Giorgos”), cum l-ar scrie oricine pe un formular. Ce nu putem scrie deloc
// devine „?”. Asta e doar în PDF: în baza de date numele rămâne exact cum l-a scris clientul.
const GREEK = {
    α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m",
    ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "h", ψ: "ps", ω: "o",
};
const CYRILLIC = {
    а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", є: "ie", ё: "io", ж: "j", з: "z", и: "i", і: "i",
    ї: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "ț", ч: "ci", ш: "ș", щ: "șci", ъ: "ă", ы: "î", ь: "", э: "e", ю: "iu", я: "ia",
};

// Litera transcrisă, cu majusculă dacă originalul era majusculă: „Ж” → „J”, „Щ” → „Șci”
function transcribe(char, table) {
    const lower = char.toLowerCase();
    const latin = table[lower];
    if (latin === undefined) return null;
    return lower === char ? latin : latin.charAt(0).toUpperCase() + latin.slice(1);
}

// Greaca o transcriem toată: fontul are câteva semne grecești (de exemplu π, pentru matematică),
// dar într-un nume trebuie „p”. Întâi scoatem accentele, apoi perechile care se citesc altfel decât
// literele lor („ου” = „ou”, ca în Papadopoulos; „αυ” = „av”; „ευ” = „ev”), apoi literă cu literă.
const GREEK_LETTER = /[Ͱ-Ͽἀ-῿]/gu;
const GREEK_PAIRS = [
    ["ου", "ou"],
    ["αυ", "av"],
    ["ευ", "ev"],
];

function greekToLatin(text) {
    let out = text.replace(GREEK_LETTER, (c) => c.normalize("NFD").replace(/\p{M}/gu, ""));
    for (const [pair, latin] of GREEK_PAIRS) {
        out = out.replace(new RegExp(pair, "giu"), (found) => {
            if (found === found.toUpperCase()) return latin.toUpperCase(); // „ΟΥ” → „OU”
            if (found[0] === found[0].toUpperCase()) return latin[0].toUpperCase() + latin.slice(1); // „Ου” → „Ou”
            return latin;
        });
    }
    return out.replace(GREEK_LETTER, (c) => transcribe(c, GREEK) ?? c);
}

// Un semn pe care fontul nu îl are
function substitute(char, font) {
    if (/\s/u.test(char)) return " "; // tab, spații speciale
    if (/[​-‍⁠﻿]/u.test(char)) return ""; // semne invizibile
    // Litera fără accentul pe care fontul nu-l are (de exemplu „ǹ” → „n”)
    const base = char.normalize("NFD").replace(/\p{M}/gu, "");
    if (base && base !== char && [...base].every((c) => font.hasGlyph(c))) return base;
    return transcribe(char, CYRILLIC) ?? "?";
}

// Textul gata de scris în PDF: literele compuse aduse la forma lor obișnuită (NFC: „s” + virgulă → „ș”),
// greaca transcrisă, iar ce nu are fontul, înlocuit ca mai sus
function printable(text, font) {
    let value = String(text ?? "").normalize("NFC");
    if (/[Ͱ-Ͽἀ-῿]/u.test(value)) value = greekToLatin(value);
    let out = "";
    for (const char of value) {
        out += font.hasGlyph(char) ? char : substitute(char, font);
    }
    return out;
}

const money = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unitPrice = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const quantity = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 3 });

// „2026-11-01” → „01.11.2026”
function day(date) {
    if (!date) return "";
    const [year, month, dayOfMonth] = String(date).slice(0, 10).split("-");
    return `${dayOfMonth}.${month}.${year}`;
}

// CNP-ul are 13 cifre; restul e CUI
function taxIdLabel(code) {
    return /^\d{13}$/.test(code) ? "CNP" : "CUI";
}

// Împarte un text pe rânduri care încap în lățimea dată (cuvintele prea lungi se rup).
// coverage = fontul citit de noi, ca să știm ce litere are (vezi printable)
function wrap(text, font, size, maxWidth, coverage) {
    const lines = [];
    for (const paragraph of String(text ?? "").split(/\r?\n/)) {
        let line = "";
        for (const word of printable(paragraph, coverage).split(/\s+/).filter(Boolean)) {
            const candidate = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
                line = candidate;
                continue;
            }
            if (line) lines.push(line);
            line = word;
            while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
                let cut = line.length - 1;
                while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut--;
                lines.push(line.slice(0, cut));
                line = line.slice(cut);
            }
        }
        lines.push(line);
    }
    return lines;
}

export async function invoicePdf(data) {
    const { invoice, lines, original, order, shop } = data;
    const storno = invoice.kind === "storno";
    const files = await loadAssets();

    const pdf = await PDFDocument.create();
    pdf.registerFontkit(trueTypeFontkit);
    const regular = await pdf.embedFont(files.regular);
    const bold = await pdf.embedFont(files.bold);
    const logo = await pdf.embedPng(files.logo);

    const title = `${storno ? "Factură de stornare" : "Factură"} ${invoice.series} ${invoice.number}`;
    pdf.setTitle(title);
    pdf.setAuthor(invoice.seller_name ?? "");
    pdf.setSubject(order?.order_number ? `Comanda online #${order.order_number}` : title);
    pdf.setLanguage("ro-RO");
    pdf.setCreator("Panos Greco");
    pdf.setProducer("Panos Greco");

    let page = pdf.addPage([PAGE.width, PAGE.height]);
    let y = PAGE.height - MARGIN;

    const write = (text, x, top, { font = regular, size = 9, color = TEXT, align = "left" } = {}) => {
        const value = printable(text, files.coverage);
        const width = font.widthOfTextAtSize(value, size);
        const left = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
        page.drawText(value, { x: left, y: top - size, size, font, color });
    };
    const line = (top, from = MARGIN, to = RIGHT, color = LINE, thickness = 0.75) => {
        page.drawLine({ start: { x: from, y: top }, end: { x: to, y: top }, thickness, color });
    };

    // ---------- Antet: sigla, furnizorul și titlul ----------
    const logoHeight = 46;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    page.drawImage(logo, { x: MARGIN, y: y - logoHeight, width: logoWidth, height: logoHeight });

    const sellerX = MARGIN + logoWidth + 14;
    let left = y;
    write("FURNIZOR", sellerX, left, { size: 7, color: MUTED });
    left -= 11;
    write(invoice.seller_name, sellerX, left, { font: bold, size: 10 });
    left -= 14;
    const sellerLines = [
        invoice.seller_cui && `CUI: ${invoice.seller_cui}`,
        invoice.seller_reg_com && `Nr. Reg. Com.: ${invoice.seller_reg_com}`,
        ...wrap(invoice.seller_address ? `Sediul: ${invoice.seller_address}` : "", regular, 8.5, 230, files.coverage),
    ].filter(Boolean);
    for (const text of sellerLines) {
        write(text, sellerX, left, { size: 8.5 });
        left -= 12;
    }

    let right = y;
    write(storno ? "FACTURĂ DE STORNARE" : "FACTURĂ", RIGHT, right, {
        font: bold,
        size: storno ? 14 : 18,
        color: OLIVE,
        align: "right",
    });
    right -= storno ? 22 : 26;
    write(`Seria ${invoice.series} nr. ${invoice.number}`, RIGHT, right, { font: bold, size: 11, align: "right" });
    right -= 15;
    write(`Data emiterii: ${day(invoice.issue_date)}`, RIGHT, right, { size: 9, align: "right" });
    right -= 12;
    if (original) {
        write(`Stornează factura ${original.series} ${original.number} din ${day(original.issue_date)}`, RIGHT, right, {
            size: 9,
            align: "right",
        });
        right -= 12;
    }
    if (order?.order_number) {
        write(`Comanda online #${order.order_number}`, RIGHT, right, { size: 8.5, color: MUTED, align: "right" });
        right -= 12;
    }

    y = Math.min(left, right, y - logoHeight) - 10;
    line(y);
    y -= 16;

    // ---------- Cumpărătorul ----------
    write("CUMPĂRĂTOR", MARGIN, y, { size: 7, color: MUTED });
    y -= 11;
    write(invoice.buyer_name, MARGIN, y, { font: bold, size: 10 });
    y -= 14;
    const buyerLines = [
        invoice.buyer_cui && `${taxIdLabel(invoice.buyer_cui)}: ${invoice.buyer_cui}`,
        invoice.buyer_reg_com && `Nr. Reg. Com.: ${invoice.buyer_reg_com}`,
        ...wrap(invoice.buyer_address ? `Adresa: ${invoice.buyer_address}` : "", regular, 8.5, 360, files.coverage),
    ].filter(Boolean);
    for (const text of buyerLines) {
        write(text, MARGIN, y, { size: 8.5 });
        y -= 12;
    }
    y -= 10;

    // ---------- Tabelul ----------
    const tableHeader = () => {
        const height = 24;
        page.drawRectangle({ x: MARGIN, y: y - height, width: WIDTH, height, color: HEAD_BG });
        line(y);
        let x = MARGIN;
        for (const column of COLUMNS) {
            const labelTop = y - (column.label.length === 1 ? 12 : 4);
            column.label.forEach((label, index) => {
                const at = column.right ? x + column.width - 4 : x + 4;
                write(label, at, labelTop - index * 9.5, {
                    font: bold,
                    size: 7.5,
                    color: MUTED,
                    align: column.right ? "right" : "left",
                });
            });
            x += column.width;
        }
        y -= height;
        line(y);
    };

    const newPage = () => {
        page = pdf.addPage([PAGE.width, PAGE.height]);
        y = PAGE.height - MARGIN;
        write(`${title} (continuare)`, MARGIN, y, { size: 8.5, color: MUTED });
        y -= 20;
    };

    tableHeader();
    for (const item of lines) {
        const descriptionLines = wrap(item.description, regular, 8.5, COLUMNS[1].width - 8, files.coverage);
        const height = 8 + descriptionLines.length * 11;
        if (y - height < BOTTOM) {
            newPage();
            tableHeader();
        }

        const cells = {
            no: String(item.line_no),
            unit: item.unit,
            quantity: quantity.format(Number(item.quantity)),
            price: unitPrice.format(Number(item.unit_price_net)),
            net: money.format(Number(item.net)),
            rate: `${Number(item.vat_rate)}%`,
            vat: money.format(Number(item.vat)),
        };
        let x = MARGIN;
        for (const column of COLUMNS) {
            if (column.key === "description") {
                descriptionLines.forEach((text, index) => write(text, x + 4, y - 5 - index * 11, { size: 8.5 }));
            } else {
                write(cells[column.key], column.right ? x + column.width - 4 : x + 4, y - 5, {
                    size: 8.5,
                    align: column.right ? "right" : "left",
                });
            }
            x += column.width;
        }
        y -= height;
        line(y);
    }

    // ---------- Totaluri (dreapta) și mențiuni (stânga) ----------
    const byRate = new Map();
    for (const item of lines) {
        const rate = Number(item.vat_rate);
        const sums = byRate.get(rate) ?? { net: 0, vat: 0 };
        sums.net += Math.round(Number(item.net) * 100);
        sums.vat += Math.round(Number(item.vat) * 100);
        byRate.set(rate, sums);
    }
    const rates = [...byRate.entries()].sort(([a], [b]) => b - a);

    const notes = [
        invoice.payment_method && `Modalitate de plată: ${invoice.payment_method}`,
        invoice.note && `Mențiuni: ${invoice.note}`,
    ].filter(Boolean);
    const noteLines = notes.flatMap((text) => wrap(text, regular, 8.5, 270, files.coverage));
    const legal = wrap(
        "Sumele sunt în lei. Factura este valabilă fără semnătură și ștampilă (art. 319 alin. (29) din Codul fiscal).",
        regular,
        7,
        270,
        files.coverage,
    );
    const totalsHeight = 16 + rates.length * 12 + 12 + 12 + 12 + 30;
    const notesHeight = 16 + noteLines.length * 12 + 6 + legal.length * 9;
    if (y - Math.max(totalsHeight, notesHeight) < BOTTOM) newPage();

    y -= 16;
    const top = y;
    const totalsLeft = RIGHT - 220;
    let t = top;
    for (const [rate, sums] of rates) {
        write(`Cota ${rate}%: bază ${money.format(sums.net / 100)}`, totalsLeft, t, { size: 8.5, color: MUTED });
        write(`TVA ${money.format(sums.vat / 100)}`, RIGHT, t, { size: 8.5, color: MUTED, align: "right" });
        t -= 12;
    }
    t -= 4;
    line(t, totalsLeft);
    t -= 8;
    write("Total fără TVA", totalsLeft, t, { size: 9 });
    write(money.format(Number(invoice.total_net)), RIGHT, t, { size: 9, align: "right" });
    t -= 12;
    write("Total TVA", totalsLeft, t, { size: 9 });
    write(money.format(Number(invoice.total_vat)), RIGHT, t, { size: 9, align: "right" });
    t -= 17;
    line(t, totalsLeft, RIGHT, TEXT, 1);
    t -= 8;
    write(storno ? "Total stornat" : "Total de plată", totalsLeft, t, { font: bold, size: 11 });
    write(`${money.format(Number(invoice.total))} lei`, RIGHT, t, { font: bold, size: 11, align: "right" });

    let n = top;
    for (const text of noteLines) {
        write(text, MARGIN, n, { size: 8.5, color: TEXT });
        n -= 12;
    }
    n -= 6;
    for (const text of legal) {
        write(text, MARGIN, n, { size: 7, color: MUTED });
        n -= 9;
    }

    // ---------- Subsolul fiecărei pagini ----------
    const pages = pdf.getPages();
    const contact = [shop?.legal_name ?? invoice.seller_name, shop?.email, shop?.phone].filter(Boolean).join(" · ");
    pages.forEach((current, index) => {
        page = current;
        line(BOTTOM - 14);
        write(contact, MARGIN, BOTTOM - 20, { size: 7, color: MUTED });
        write(`Pagina ${index + 1} din ${pages.length}`, RIGHT, BOTTOM - 20, { size: 7, color: MUTED, align: "right" });
    });

    return pdf.save();
}
