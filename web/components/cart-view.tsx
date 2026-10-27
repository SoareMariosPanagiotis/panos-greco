"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/catalog";

export function CartView() {
    const { items, totalPrice, updateQuantity, removeItem } = useCart();

    if (items.length === 0) {
        return (
            <div className="mt-8 rounded-xl border bg-white p-10 text-center">
                <p className="text-neutral-600">Coșul tău este gol.</p>
                <Link href="/" className="mt-4 inline-block font-medium text-olive hover:underline">
                    Vezi produsele
                </Link>
            </div>
        );
    }

    return (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <ul className="divide-y rounded-xl border bg-white">
                {items.map((item) => (
                    <li key={item.variantId} className="flex flex-wrap items-center gap-4 p-4">
                        <div className="min-w-0 flex-1">
                            <Link href={`/produse/${item.productSlug}`} className="font-medium hover:text-olive">
                                {item.productName}
                            </Link>
                            <p className="text-sm text-neutral-500">
                                {item.sizeLabel} · {formatPrice(item.price)} / buc.
                            </p>
                        </div>
                        <div className="flex items-center rounded-lg border">
                            <button
                                type="button"
                                onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                className="px-3 py-1"
                                aria-label="Scade cantitatea"
                            >
                                −
                            </button>
                            <span className="w-10 text-center">{item.quantity}</span>
                            <button
                                type="button"
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                className="px-3 py-1"
                                aria-label="Crește cantitatea"
                            >
                                +
                            </button>
                        </div>
                        <p className="w-28 text-right font-semibold">
                            {formatPrice(String(Number(item.price) * item.quantity))}
                        </p>
                        <button
                            type="button"
                            onClick={() => removeItem(item.variantId)}
                            className="text-sm text-neutral-500 hover:text-red-600"
                        >
                            Șterge
                        </button>
                    </li>
                ))}
            </ul>

            <aside className="h-fit rounded-xl border bg-white p-6">
                <h2 className="font-semibold">Sumar</h2>
                <div className="mt-4 flex justify-between">
                    <span>Produse</span>
                    <span>{formatPrice(String(totalPrice))}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm text-neutral-500">
                    <span>Livrare</span>
                    <span>se calculează la comandă</span>
                </div>
                <Link
                    href="/comanda"
                    className="mt-6 block w-full rounded-lg bg-olive px-4 py-3 text-center font-medium text-white hover:bg-olive/90"
                >
                    Finalizează comanda
                </Link>
            </aside>
        </div>
    );
}