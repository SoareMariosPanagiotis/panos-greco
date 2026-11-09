"use client";

import { useState, type ReactNode } from "react";
import { ProductGallery } from "@/components/product-gallery";
import { VariantPicker } from "@/components/variant-picker";
import type { Variant } from "@/lib/catalog";
import type { ProductImage } from "@/lib/product-images";

type Props = {
    images: ProductImage[];
    variants: Variant[];
    productName: string;
    productSlug: string;
    children: ReactNode; // titlul, categoria și eticheta BIO, făcute pe server
    after?: ReactNode; // sub butonul de coș: livrarea și returul, tot de pe server
};

// Ce poze arată galeria, ca la magazinele mari: întâi pozele mărimii alese (la ulei, prima e cea
// cu avantajele și mărimea scrisă pe ea), apoi pozele generale ale produsului. Pozele celorlalte
// mărimi nu încurcă. Și la deschiderea paginii e la fel: e aleasă deja prima mărime, deci se vede
// întâi poza ei.
function photosFor(images: ProductImage[], variantId: string | undefined) {
    const general = images.filter((image) => !image.variantId);
    const own = images.filter((image) => image.variantId !== null && image.variantId === variantId);
    const shown = [...own, ...general];
    return shown.length > 0 ? shown : images; // plasă de siguranță: dacă există poze, galeria nu rămâne goală
}

// Partea de sus a paginii produsului: galeria (stânga) și alegerea mărimii (dreapta).
// Mărimea aleasă stă aici, deasupra amândurora („lifting state up”, în React):
// butoanele o schimbă, iar galeria arată pozele ei.
export function ProductShowcase({ images, variants, productName, productSlug, children, after }: Props) {
    const [variantId, setVariantId] = useState(variants[0]?.id);

    return (
        <div className="mt-4 grid gap-6 sm:mt-6 md:grid-cols-2 md:gap-10">
            {/* key: la altă mărime, galeria pornește de la capăt, de la prima poză a mărimii */}
            <ProductGallery
                key={variantId ?? "general"}
                images={photosFor(images, variantId)}
                productName={productName}
            />
            <div>
                {children}
                <VariantPicker
                    productName={productName}
                    productSlug={productSlug}
                    variants={variants}
                    selectedId={variantId}
                    onSelect={setVariantId}
                />
                {after}
            </div>
        </div>
    );
}
