import { CartView } from "@/components/cart-view";

export default function CartPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <h1 className="text-3xl font-bold text-olive">Coșul de cumpărături</h1>
            <CartView />
        </main>
    );
}