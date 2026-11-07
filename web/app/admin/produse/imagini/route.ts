import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { UUID } from "@/lib/product-images";
import { PhotoError, preparePhoto } from "@/lib/product-photo";

// Încărcarea unei poze de produs, din admin (migrația 032).
//
// E o rută (route.ts) și nu un Server Action, pentru că o poză de telefon are câțiva MB, iar
// Server Actions primesc implicit cel mult 1 MB. Așa nu mărim limita pentru tot site-ul.
// Prețul: verificările pe care Server Actions le fac singure le facem aici de mână (cine ești, de unde vii).

const mutation = `
  mutation AddProductImage($productId: UUID!, $image: String!, $width: Int!, $height: Int!, $alt: String) {
    addProductImage(input: { productId: $productId, image: $image, width: $width, height: $height, alt: $alt }) {
      productImage { id }
    }
  }
`;

function reply(status: number, message: string) {
    return Response.json({ ok: status === 200, message }, { status });
}

export async function POST(request: Request) {
    // 1. Cererea vine chiar din site-ul nostru? (Server Actions verifică asta singure; aici o facem noi)
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) return reply(403, "Cerere respinsă.");

    // 2. Doar adminul. Ultimul cuvânt îl are oricum baza de date (add_product_image e doar pentru panos_admin).
    const session = await getSession();
    if (!session || session.user.role === "client") return reply(401, "Intră din nou în cont.");

    // 3. Ce a venit din formular
    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return reply(400, "Poza nu a ajuns întreagă. Încearcă din nou.");
    }
    const productId = String(form.get("productId") ?? "");
    const alt = String(form.get("alt") ?? "").trim().slice(0, 200);
    const file = form.get("file");
    if (!UUID.test(productId)) return reply(400, "Produs necunoscut.");
    if (!(file instanceof File)) return reply(400, "Alege o poză.");

    // 4. Curățăm poza (WebP, max. 2000 px, fără EXIF) și o trimitem bazei de date
    try {
        const photo = await preparePhoto(file);
        await gql(
            mutation,
            {
                productId,
                image: photo.data.toString("base64"),
                width: photo.width,
                height: photo.height,
                alt: alt || null,
            },
            session.token,
        );
    } catch (error) {
        if (error instanceof PhotoError) return reply(400, error.message);
        const message = (error as Error).message;
        // Mesajele scrise de noi în migrația 032 sunt deja pe înțeles
        if (/poz|Produsul/.test(message)) return reply(400, message);
        if (/body|too large|entity/i.test(message)) return reply(413, "Poza e prea mare pentru API.");
        return reply(500, `Nu am putut salva poza: ${message}`);
    }

    // Pozele apar în carduri și pe paginile produselor: le reîmprospătăm pe toate
    revalidatePath("/", "layout");
    return reply(200, "Poza a fost adăugată.");
}
