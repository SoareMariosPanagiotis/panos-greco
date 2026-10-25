"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";

export function CartLink() {
    const { totalCount } = useCart();

    return (
        <Link href="/cos" className="flex items-center gap-2 opacity-90 hover:opacity-100">
            <ShoppingBag className="size-5" />
            <span>Coș</span>
            {totalCount > 0 && (
                <span className="rounded-full bg-white px-2 text-xs font-bold text-olive">
          {totalCount}
        </span>
            )}
        </Link>
    );
}