import { UUID } from "@/lib/product-images";
import { fetchImageBytes } from "@/lib/product-photo";

// /imagini/<id>: fișierul unei poze de produs (migrația 032), ca WebP.
// next/image o cere de aici și face din ea mărimea potrivită fiecărui ecran.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID.test(id)) return notFound();

    let bytes: Buffer | null;
    try {
        bytes = await fetchImageBytes(id);
    } catch {
        // API-ul nu răspunde: nu păstrăm eroarea în cache, data viitoare poate merge
        return new Response("Poza nu poate fi încărcată acum.", {
            status: 503,
            headers: { "Cache-Control": "no-store", "Retry-After": "30" },
        });
    }
    if (!bytes) return notFound();

    return new Response(new Uint8Array(bytes), {
        headers: {
            "Content-Type": "image/webp",
            "Content-Length": String(bytes.length),
            // O poză nu se schimbă niciodată: una nouă primește alt id. Deci browserul o poate
            // păstra un an fără să mai întrebe („immutable”).
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    });
}

function notFound() {
    return new Response("Poza nu există.", { status: 404, headers: { "Cache-Control": "no-store" } });
}
