"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatSize, type Variant } from "@/lib/catalog";

export function VariantPicker({ variants }: { variants: Variant[] }) {
    // Starea: ce mărime e aleasă și ce cantitate
    const [selectedId, setSelectedId] = useState(variants[0]?.id);
    const [quantity, setQuantity] = useState(1);

    const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];
    if (!selected) return null;

    const total = Number(selected.price) * quantity;

    return (
        <div className="mt-8">
            <h2 className="font-semibold">{variants.length > 1 ? "Alege mărimea" : "Ambalaj"}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
                {variants.map((variant) => {
                    const isSelected = variant.id === selected.id;
                    return (
                        <button
                            key={variant.id}
                            type="button"
                            onClick={() => setSelectedId(variant.id)}
                            className={`rounded-lg border px-4 py-2 text-left transition ${
                                isSelected ? "border-olive bg-olive text-white" : "bg-white hover:border-olive"
                            }`}
                        >
              <span className="block font-medium">
                {formatSize(variant.packSize, variant.packUnit)}
              </span>
                            <span className={`block text-sm ${isSelected ? "text-white/80" : "text-neutral-500"}`}>
                {formatPrice(variant.price)}
              </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center rounded-lg border bg-white">
                    <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="px-3 py-2 text-lg"
                        aria-label="Scade cantitatea"
                    >
                        −
                    </button>
                    <span className="w-10 text-center font-medium">{quantity}</span>
                    <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="px-3 py-2 text-lg"
                        aria-label="Crește cantitatea"
                    >
                        +
                    </button>
                </div>
                <p className="text-2xl font-bold">{formatPrice(String(total))}</p>
            </div>

            <Button size="lg" className="mt-6 w-full bg-olive py-6 text-base hover:bg-olive/90">
                Adaugă în coș
            </Button>
            <p className="mt-3 text-xs text-neutral-500">Prețurile includ TVA.</p>
        </div>
    );
}