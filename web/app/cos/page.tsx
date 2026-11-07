import { Suspense } from "react";
import { getDeliveryHints } from "@/app/cos/actions";
import { CartView } from "@/components/cart-view";

async function CartLoader() {
    const hints = await getDeliveryHints();
    return <CartView hints={hints} />;
}

export default function CartPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
            <h1 className="text-3xl font-bold text-olive">Coșul de cumpărături</h1>
            <Suspense fallback={<p className="mt-8">Se încarcă...</p>}>
                <CartLoader />
            </Suspense>
        </main>
    );
}