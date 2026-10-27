"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { getDeliveryHints, type DeliveryHints } from "@/app/cos/actions";
import { useCart } from "@/components/cart-provider";
import { FreeShippingProgress } from "@/components/free-shipping-progress";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { formatPrice } from "@/lib/catalog";

export function CartDrawer() {
    const { items, totalCount, totalPrice, updateQuantity, removeItem, drawerOpen, setDrawerOpen } =
        useCart();
    const [hints, setHints] = useState<DeliveryHints | null>(null);

    // Pragul de livrare gratuită îl cerem o singură dată, la prima deschidere
    useEffect(() => {
        if (!drawerOpen || hints) return;
        let ignore = false;
        getDeliveryHints().then((result) => {
            if (!ignore) setHints(result);
        });
        return () => {
            ignore = true;
        };
    }, [drawerOpen, hints]);

    // La click pe un link, închidem panoul (pagina se schimbă, panoul nu)
    const close = () => setDrawerOpen(false);

    return (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent className="w-full gap-0 sm:max-w-md">
                <SheetHeader className="border-b">
                    <SheetTitle>Coșul tău</SheetTitle>
                    <SheetDescription>
                        {totalCount === 0
                            ? "Coșul este gol."
                            : `${totalCount} ${totalCount === 1 ? "produs" : "produse"}`}
                    </SheetDescription>
                </SheetHeader>

                {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                        <p className="text-neutral-600">Încă nu ai adăugat nimic.</p>
                        <Link href="/" onClick={close} className="font-medium text-olive hover:underline">
                            Vezi produsele
                        </Link>
                    </div>
                ) : (
                    <>
                        <ul className="flex-1 divide-y overflow-y-auto px-4">
                            {items.map((item) => (
                                <li key={item.variantId} className="py-4">
                                    <div className="flex justify-between gap-3">
                                        <div className="min-w-0">
                                            <Link
                                                href={`/produse/${item.productSlug}`}
                                                onClick={close}
                                                className="font-medium hover:text-olive"
                                            >
                                                {item.productName}
                                            </Link>
                                            <p className="text-sm text-neutral-500">
                                                {item.sizeLabel} · {formatPrice(item.price)} / buc.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.variantId)}
                                            aria-label={`Șterge ${item.productName} din coș`}
                                            className="h-fit rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center rounded-lg border">
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                                className="px-3 py-1"
                                                aria-label="Scade cantitatea"
                                            >
                                                −
                                            </button>
                                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                                className="px-3 py-1"
                                                aria-label="Crește cantitatea"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <p className="font-semibold">
                                            {formatPrice(String(Number(item.price) * item.quantity))}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <SheetFooter className="border-t">
                            <div className="flex justify-between text-base">
                                <span>Subtotal</span>
                                <span className="font-bold">{formatPrice(String(totalPrice))}</span>
                            </div>
                            {hints?.freeShipping && (
                                <FreeShippingProgress
                                    subtotal={totalPrice}
                                    over={hints.freeShipping.over}
                                    method={hints.freeShipping.method}
                                />
                            )}
                            <Link
                                href="/comanda"
                                onClick={close}
                                className="block rounded-lg bg-olive px-4 py-3 text-center font-medium text-white hover:bg-olive/90"
                            >
                                Finalizează comanda
                            </Link>
                            <Link
                                href="/cos"
                                onClick={close}
                                className="block rounded-lg border px-4 py-3 text-center font-medium hover:border-olive hover:text-olive"
                            >
                                Vezi coșul
                            </Link>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}