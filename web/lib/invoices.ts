// Facturile din site (migrația 028): tipurile, câmpurile cerute API-ului și formatarea sumelor.

export type InvoiceLine = {
    id: string;
    lineNo: number;
    description: string;
    unit: string;
    quantity: string;
    unitPriceNet: string;
    vatRate: string;
    net: string;
    vat: string;
    gross: string;
    remainingQuantity: string; // cât se mai poate storna din rând
};

export type InvoiceRef = {
    id: string;
    series: string | null;
    number: number | null;
    issueDate: string | null;
};

export type Invoice = InvoiceRef & {
    kind: "invoice" | "storno";
    status: "draft" | "issued";
    sellerName: string | null;
    sellerCui: string | null;
    sellerRegCom: string | null;
    sellerAddress: string | null;
    buyerName: string;
    buyerCui: string | null;
    buyerRegCom: string | null;
    buyerAddress: string | null;
    buyerEmail: string | null;
    paymentMethod: string | null;
    note: string | null;
    totalNet: string;
    totalVat: string;
    total: string;
    createdAt: string;
    orderByOrderId: { orderNumber: number } | null;
    invoiceByStornoOf: InvoiceRef | null; // la stornare: factura stornată
    invoicesByStornoOf: { nodes: (InvoiceRef & { status: string; total: string })[] }; // stornările ei
    invoiceLinesByInvoiceId: { nodes: InvoiceLine[] };
    emailDelivery: string | null; // câmp calculat (migrația 029): JSON cu starea trimiterii pe email
    fileName: string | null; // „Factura-PGW-3002.pdf” (migrația 030); o ciornă nu are încă nume
    pdfStatus: string | null; // câmp calculat (migrația 030): JSON cu starea PDF-ului arhivat
};

// PostGraphile dă câmpurile JSON ca text: le citim cu JSON.parse, iar un text stricat înseamnă „nimic”
function parseJsonText<T>(value: string | null | undefined): T | null {
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

// Starea trimiterii pe email
export type EmailDelivery = { email: string; sentAt: string | null; attempts: number; lastError: string | null };

export function parseEmailDelivery(value: string | null): EmailDelivery | null {
    return parseJsonText<EmailDelivery>(value);
}

// Starea PDF-ului arhivat (migrația 030): poștașul îl face în câteva secunde de la emitere
export type PdfStatus = {
    ready: boolean;
    renderedAt: string | null;
    bytes: number | null;
    attempts: number;
    lastError: string | null;
};

export function parsePdfStatus(value: string | null): PdfStatus | null {
    return parseJsonText<PdfStatus>(value);
}

// O factură emisă, așa cum o vede clientul pe pagina comenzii (câmpul calculat order.invoiceFiles)
export type InvoiceFile = {
    id: string;
    kind: "invoice" | "storno";
    series: string;
    number: number;
    issueDate: string;
    total: number;
    ready: boolean;
};

export function parseInvoiceFiles(value: string | null | undefined): InvoiceFile[] {
    const list = parseJsonText<InvoiceFile[]>(value);
    return Array.isArray(list) ? list : [];
}

// Linkul PDF-ului: /factura/<id>. Clientul fără cont mai primește ?comanda=<id-ul comenzii>:
// id-ul lung al comenzii e „cheia” din mail și merge 30 de zile de la emiterea facturii.
// Clientul conectat (comenzile lui) și adminul îl deschid oricând.
export function invoicePdfHref(invoiceId: string, orderId?: string) {
    return orderId ? `/factura/${invoiceId}?comanda=${orderId}` : `/factura/${invoiceId}`;
}

// Tot ce afișează pagina unei facturi, într-o singură cerere
export const INVOICE_FIELDS = `
  id kind status series number issueDate
  sellerName sellerCui sellerRegCom sellerAddress
  buyerName buyerCui buyerRegCom buyerAddress buyerEmail
  paymentMethod note totalNet totalVat total createdAt
  orderByOrderId { orderNumber }
  invoiceByStornoOf { id series number issueDate }
  invoicesByStornoOf(orderBy: CREATED_AT_ASC) { nodes { id series number issueDate status total } }
  invoiceLinesByInvoiceId(orderBy: LINE_NO_ASC) {
    nodes { id lineNo description unit quantity unitPriceNet vatRate net vat gross remainingQuantity }
  }
  emailDelivery fileName pdfStatus
`;

// „PGW 3000”. O ciornă nu are încă număr: îl primește la emitere.
export function invoiceNumber(invoice: { series: string | null; number: number | null }) {
    return invoice.series && invoice.number !== null ? `${invoice.series} ${invoice.number}` : "fără număr";
}

export function invoiceKindLabel(kind: string) {
    return kind === "storno" ? "Stornare" : "Factură";
}

// „2026-11-01” → „01.11.2026”. E o zi din calendar, fără oră, așa că n-o trecem prin Date
// (altfel fusul orar o poate muta pe ziua de dinainte).
export function formatInvoiceDate(date: string | null) {
    if (!date) return "—";
    const [year, month, day] = date.split("-");
    return `${day}.${month}.${year}`;
}

const moneyFormat = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unitPriceFormat = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const quantityFormat = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 3 });

// „1234.5” → „1.234,50”
export function formatMoney(value: string | number) {
    return moneyFormat.format(Number(value));
}

// Prețul unitar fără TVA are până la 4 zecimale: 75 lei cu TVA pentru 2 bucăți → 33,785
export function formatUnitPrice(value: string) {
    return unitPriceFormat.format(Number(value));
}

export function formatQuantity(value: string | number) {
    return quantityFormat.format(Number(value));
}

// „11.00” → „11%”
export function formatRate(value: string | number) {
    return `${Number(value)}%`;
}

// Cumpărătorul are CUI (firmă) sau CNP (persoană, 13 cifre)
export function taxIdLabel(code: string) {
    return /^\d{13}$/.test(code) ? "CNP" : "CUI";
}

// Baza și TVA-ul pe fiecare cotă, adunate în bani (numere întregi), ca să nu apară erori de zecimale
export function vatBreakdown(lines: Pick<InvoiceLine, "vatRate" | "net" | "vat">[]) {
    const byRate = new Map<number, { net: number; vat: number }>();
    for (const line of lines) {
        const rate = Number(line.vatRate);
        const sums = byRate.get(rate) ?? { net: 0, vat: 0 };
        sums.net += Math.round(Number(line.net) * 100);
        sums.vat += Math.round(Number(line.vat) * 100);
        byRate.set(rate, sums);
    }
    return [...byRate.entries()]
        .sort(([a], [b]) => b - a)
        .map(([rate, sums]) => ({ rate, net: sums.net / 100, vat: sums.vat / 100 }));
}
