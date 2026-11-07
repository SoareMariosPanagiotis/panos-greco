// Partea de server a pozelor de produs (migrația 032): citirea unei poze din API și pregătirea
// unei poze noi cu sharp. Doar pe server: sharp e o bibliotecă nativă, nu merge în browser.

import sharp from "sharp";
import { gql } from "@/lib/catalog";

// ---------- Citirea unei poze, pentru ruta /imagini/[id] ----------

const dataQuery = `
  query ProductImageData($imageId: UUID!) {
    productImageData(imageId: $imageId)
  }
`;

// null = nu există. Citim ca vizitator: pozele sunt publice.
export async function fetchImageBytes(imageId: string) {
    const data = await gql<{ productImageData: string | null }>(dataQuery, { imageId });
    return data.productImageData ? Buffer.from(data.productImageData, "base64") : null;
}

// ---------- Pregătirea unei poze noi ----------

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB: o poză mare de telefon încape lejer
const MAX_SIDE = 2000; // pixeli pe latura lungă: destul pentru zoom pe un ecran mare

export class PhotoError extends Error {}

// Primește fișierul încărcat și întoarce un WebP curat:
//  - rotate(): întoarce poza după cum a fost ținut telefonul (informația vine din EXIF);
//  - resize(): cel mult 2000 px pe latura lungă, fără să mărească pozele mici;
//  - webp(): format modern, cam de 3 ori mai mic decât JPEG la aceeași calitate;
//  - sharp NU copiază metadatele (EXIF) în fișierul nou, deci dispar locul GPS și datele telefonului.
export async function preparePhoto(file: File) {
    if (file.size === 0) throw new PhotoError("Fișierul e gol.");
    if (file.size > MAX_UPLOAD_BYTES) throw new PhotoError("Poza e prea mare (peste 20 MB).");

    try {
        const input = Buffer.from(await file.arrayBuffer());
        // limitInputPixels: refuzăm pozele uriașe (de ex. 20 000 × 20 000 px), care ar bloca serverul
        const { data, info } = await sharp(input, { failOn: "error", limitInputPixels: 60_000_000 })
            .rotate()
            .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer({ resolveWithObject: true });
        return { data, width: info.width, height: info.height };
    } catch {
        // De obicei: nu e o poză sau e HEIC (formatul iPhone), pe care sharp nu-l citește
        throw new PhotoError("Nu am putut citi poza. Folosește JPG, PNG sau WebP.");
    }
}
