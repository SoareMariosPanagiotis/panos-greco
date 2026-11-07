"use client";

import { ShoppingBag } from "lucide-react";
import { CartDrawer } from "@/components/cart-drawer";
import { useCart } from "@/components/cart-provider";
import { tabItemClass } from "@/lib/nav";

export function CartLink() {
    const { totalCount, setDrawerOpen } = useCart();

    return (
        <>
            <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={`Deschide coșul (${totalCount} produse)`}
                className="flex items-center gap-2 opacity-90 hover:opacity-100"
            >
                <ShoppingBag className="size-5" />
                <span>Coș</span>
                {totalCount > 0 && (
                    <span className="rounded-full bg-white px-2 text-xs font-bold text-olive">
            {totalCount}
          </span>
                )}
            </button>
            <CartDrawer />
        </>
    );
}

// Butonul „Coș” din bara de jos de pe telefon. Deschide același sertar ca butonul de sus
// (sertarul e desenat o singură dată, de CartLink, care rămâne pe pagină și pe telefon, doar ascuns).
export function CartTab() {
    const { totalCount, setDrawerOpen } = useCart();

    return (
        <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={`Deschide coșul (${totalCount} produse)`}
            className={tabItemClass}
        >
            <span className="relative">
                <ShoppingBag className="size-5" />
                {/* Bulina cu numărul de produse, în colțul iconiței */}
                {totalCount > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-olive px-1 text-center text-[10px] leading-4 font-bold text-white">
                        {totalCount}
                    </span>
                )}
            </span>
            <span>Coș</span>
        </button>
    );
}
