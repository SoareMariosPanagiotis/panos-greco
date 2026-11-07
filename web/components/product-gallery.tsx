"use client";

import { useState } from "react";
import Image from "next/image";
import { imageSrc, type ProductImage } from "@/lib/product-images";

type Props = { images: ProductImage[]; productName: string };

// Galeria de pe pagina produsului: poza mare și, dedesubt, miniaturile (dacă sunt mai multe).
// Pe telefon, rândul de miniaturi se derulează cu degetul, ca rândul de categorii.
export function ProductGallery({ images, productName }: Props) {
    const [current, setCurrent] = useState(0);

    // Fără poze: prima literă din nume, ca până acum
    if (images.length === 0) {
        return (
            <div className="flex aspect-square items-center justify-center rounded-xl border bg-olive-light text-8xl font-bold text-olive/30">
                {productName[0]}
            </div>
        );
    }

    const shown = images[current] ?? images[0];

    return (
        <div>
            <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
                {/* object-contain: arătăm toată poza, fără să tăiem din ea (sticla întreagă, nu doar mijlocul) */}
                <Image
                    key={shown.id}
                    src={imageSrc(shown.id)}
                    alt={shown.alt ?? productName}
                    fill
                    loading={current === 0 ? "eager" : undefined}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-contain"
                />
            </div>

            {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setCurrent(index)}
                            aria-label={`Poza ${index + 1} din ${images.length}`}
                            aria-current={index === current ? "true" : undefined}
                            className={`relative size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition sm:size-20 ${
                                index === current ? "border-olive" : "border-transparent opacity-70 hover:opacity-100"
                            }`}
                        >
                            <Image src={imageSrc(image.id)} alt="" fill sizes="80px" className="object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
