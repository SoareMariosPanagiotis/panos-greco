import { getToken } from "@/lib/auth";
import { invoicePdfResponse, tooManyRequests } from "@/lib/invoice-pdf";
import { rateLimit } from "@/lib/rate-limit";

// /factura/<id>?comanda=<id-ul comenzii>: PDF-ul unei facturi emise, exact cel arhivat (migrația 030).
// E o rută (route.ts), nu o pagină: răspunde cu fișierul, nu cu HTML.
// Cine îl primește hotărăște baza de date: adminul, clientul conectat (comenzile lui)
// și oricine are linkul din mail (?comanda=..., 30 de zile de la emiterea facturii).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const limited = await rateLimit("invoicePdf");
    if (limited) return tooManyRequests(limited);

    const { id } = await params;
    const receiptId = new URL(request.url).searchParams.get("comanda");
    return invoicePdfResponse(id, receiptId, await getToken());
}
