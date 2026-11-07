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
};

// Prima poză a unei mărimi, dacă are; altfel null
function imageOf(images: ProductImage[], variantId: string | undefined) {
    const index = images.findIndex((image) => image.variantId === variantId);
    return index >= 0 ? index : null;
}

// Partea de sus a paginii produsului: galeria (stânga) și alegerea mărimii (dreapta).
// Sunt legate între ele, deci starea comună („ce mărime”, „ce poză”) stă aici, deasupra amândurora
// („lifting state up”, în React): alegi 5 l → galeria sare la poza canistrei; apeși pe poza
// canistrei → se alege 5 l.
export function ProductShowcase({ images, variants, productName, productSlug, children }: Props) {
    const [variantId, setVariantId] = useState(variants[0]?.id);
    const [current, setCurrent] = useState(() => imageOf(images, variants[0]?.id) ?? 0);

    function selectVariant(id: string) {
        setVariantId(id);
        const index = imageOf(images, id);
        if (index !== null) setCurrent(index); // fără poză proprie: rămâne poza de acum
    }

    function selectImage(index: number) {
        setCurrent(index);
        const imageVariant = images[index]?.variantId;
        if (imageVariant) setVariantId(imageVariant);
    }

    return (
        <div className="mt-4 grid gap-6 sm:mt-6 md:grid-cols-2 md:gap-10">
            <ProductGallery images={images} productName={productName} current={current} onSelect={selectImage} />
            <div>
                {children}
                <VariantPicker
                    productName={productName}
                    productSlug={productSlug}
                    variants={variants}
                    selectedId={variantId}
                    onSelect={selectVariant}
                />
            </div>
        </div>
    );
}
