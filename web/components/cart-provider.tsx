"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
    variantId: string;
    productName: string;
    productSlug: string;
    sizeLabel: string;
    price: string;
    quantity: number;
};

type CartContextValue = {
    items: CartItem[];
    totalCount: number;
    totalPrice: number;
    addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
    updateQuantity: (variantId: string, quantity: number) => void;
    removeItem: (variantId: string) => void;
    clearCart: () => void;
    // Coșul din lateral: îl deschid și antetul, și pagina produsului
    drawerOpen: boolean;
    setDrawerOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "panos-greco-cart";

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // 1. La pornire: citim coșul salvat în browser
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setItems(JSON.parse(saved));
        } catch {
            // dacă browserul nu permite localStorage, pornim cu coș gol
        }
        setLoaded(true);
    }, []);

    // 2. La fiecare schimbare: salvăm coșul în browser
    useEffect(() => {
        if (!loaded) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // nu putem salva, dar coșul merge în continuare în pagină
        }
    }, [items, loaded]);

    function addItem(item: Omit<CartItem, "quantity">, quantity: number) {
        setItems((current) => {
            const existing = current.find((i) => i.variantId === item.variantId);
            if (existing) {
                // produsul e deja în coș: creștem doar cantitatea
                return current.map((i) =>
                    i.variantId === item.variantId ? { ...i, quantity: i.quantity + quantity } : i,
                );
            }
            return [...current, { ...item, quantity }];
        });
    }

    function removeItem(variantId: string) {
        setItems((current) => current.filter((i) => i.variantId !== variantId));
    }

    function updateQuantity(variantId: string, quantity: number) {
        if (quantity < 1) {
            removeItem(variantId);
            return;
        }
        setItems((current) =>
            current.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
        );
    }

    function clearCart() {
        setItems([]);
    }

    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                totalCount,
                totalPrice,
                addItem,
                updateQuantity,
                removeItem,
                clearCart,
                drawerOpen,
                setDrawerOpen,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const cart = useContext(CartContext);
    if (!cart) throw new Error("useCart trebuie folosit în interiorul CartProvider");
    return cart;
}