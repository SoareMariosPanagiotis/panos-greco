import { cache } from "react";
import { gql, sizeSlug } from "@/lib/catalog";

// Prețurile uleiului pe mărimi, citite din baza de date (le schimbi din admin, nu de aici).
// Le folosește bannerul de pe prima pagină: sub fiecare sticlă, prețul ei.
//
// cache() (din React): oricâte componente cer prețurile în aceeași cerere, interogarea pleacă o singură
// dată. Altfel, cinci sticle ar însemna cinci interogări identice.

export const OIL_SLUG = "ulei-de-masline-extravirgin-bio";
export const OIL_PATH = `/produse/${OIL_SLUG}`;

const query = `
  query OilSizes($slug: String!) {
    productBySlug(slug: $slug) {
      productVariantsByProductId(orderBy: PACK_SIZE_ASC) {
        nodes { packSize packUnit price }
      }
    }
  }
`;

type Data = {
    productBySlug: {
        productVariantsByProductId: { nodes: { packSize: number; packUnit: string; price: string }[] };
    } | null;
};

/** Mărimea (ca în adresă, „1-l”) → prețul ei. Dacă API-ul nu răspunde, rămâne gol și bannerul arată doar mărimile. */
const getOilPrices = cache(async () => {
    const data = await gql<Data>(query, { slug: OIL_SLUG }).catch(() => null);
    const prices = new Map<string, string>();
    for (const variant of data?.productBySlug?.productVariantsByProductId.nodes ?? []) {
        prices.set(sizeSlug(variant.packSize, variant.packUnit), variant.price);
    }
    return prices;
});

/** 25.00 → „25 lei”, 25.50 → „25,50 lei”: pe banner, prețul cât mai scurt */
function shortPrice(price: string) {
    const value = Number(price);
    return Number.isInteger(value)
        ? `${value} lei`
        : `${value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lei`;
}

export async function OilPrice({ size, className }: { size: string; className?: string }) {
    const price = (await getOilPrices()).get(size);
    return price ? <span className={className}>{shortPrice(price)}</span> : null;
}
