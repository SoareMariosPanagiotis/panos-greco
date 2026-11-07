// Pozele produselor (migrația 032): tipurile, citirea unei poze și pregătirea unei poze noi.
//
// Drumul unei poze:
//   admin (fișierul de pe telefon/PC) → preparePhoto (sharp: micșorare, WebP, fără EXIF)
//   → API (catalog.add_product_image) → Postgres → /imagini/[id] → next/image (mărimea potrivită ecranului)
//
// Fișierul ăsta e folosit și de componentele din browser, deci nu are voie să importe sharp.
// Partea cu sharp e în lib/product-photo.ts, care rulează doar pe server.

// variantId: mărimea căreia îi aparține poza (migrația 033); null = poză generală a produsului
export type ProductImage = { id: string; alt: string | null; width: number; height: number; variantId: string | null };

// Câmpurile cerute în interogări, aceleași peste tot
export const PRODUCT_IMAGE_FIELDS = `
  productImagesByProductId(orderBy: [POSITION_ASC, CREATED_AT_ASC]) {
    nodes { id alt width height variantId }
  }
`;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function imageSrc(id: string) {
    return `/imagini/${id}`;
}
