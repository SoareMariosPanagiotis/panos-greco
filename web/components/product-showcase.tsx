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

// Ce poze arată galeria, ca la magazinele mari: pozele mărimii alese plus pozele generale ale
// produsului; pozele celorlalte mărimi nu încurcă. Până alege clientul o mărime, întâi pozele
// generale (cea de pe card, ca pagina să continue ce a văzut), apoi cele ale mărimii de pornire.
// După ce alege, întâi pozele mărimii lui.
function photosFor(images: ProductImage[], variantId: string | undefined, chosen: boolean) {
    const general = images.filter((image) => !image.variantId);
    const own = images.filter((image) => image.variantId !== null && image.variantId === variantId);
    const shown = chosen ? [...own, ...general] : [...general, ...own];
    return shown.length > 0 ? shown : images; // plasă de siguranță: dacă există poze, galeria nu rămâne goală
}

// Partea de sus a paginii produsului: galeria (stânga) și alegerea mărimii (dreapta).
// Mărimea aleasă stă aici, deasupra amândurora („lifting state up”, în React):
// butoanele o schimbă, iar galeria arată pozele ei.
export function ProductShowcase({ images, variants, productName, productSlug, children, after }: Props) {
    const [variantId, setVariantId] = useState(variants[0]?.id);
    const [chosen, setChosen] = useState(false);

    function selectVariant(id: string) {
        setVariantId(id);
        setChosen(true);
    }

    return (
        <div className="mt-4 grid gap-6 sm:mt-6 md:grid-cols-2 md:gap-10">
            {/* key: la altă mărime, galeria pornește de la capăt, de la prima poză a mărimii */}
            <ProductGallery
                key={chosen ? variantId : "general"}
                images={photosFor(images, variantId, chosen)}
                productName={productName}
            />
            <div>
                {children}
                <VariantPicker
                    productName={productName}
                    productSlug={productSlug}
                    variants={variants}
                    selectedId={variantId}
                    onSelect={selectVariant}
                />
                {after}
            </div>
        </div>
    );
}
