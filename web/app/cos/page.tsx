import { Suspense } from "react";
import { CartView } from "@/components/cart-view";
import { gql } from "@/lib/catalog";

const query = `
  query DeliveryForCart {
    allDeliveryMethods(orderBy: SORT_ORDER_ASC) {
      nodes { name price freeOver }
    }
  }
`;

type Method = { name: string; price: string; freeOver: string | null };

async function CartLoader() {
    // Dacă API-ul nu răspunde, coșul merge oricum, doar fără mesajul despre livrare
    const data = await gql<{ allDeliveryMethods: { nodes: Method[] } }>(query).catch(() => null);
    const methods = data?.allDeliveryMethods.nodes ?? [];

    // Metoda cu plată care are cel mai mic prag de livrare gratuită (la noi: curierul)
    const withThreshold = methods
        .filter((method) => Number(method.price) > 0 && method.freeOver !== null)
        .sort((a, b) => Number(a.freeOver) - Number(b.freeOver));
    const first = withThreshold[0];
    const freeShipping = first ? { over: Number(first.freeOver), method: first.name } : null;

    // Metodele care sunt mereu gratuite (Galați, ridicare din magazin)
    const alwaysFree = methods
        .filter((method) => Number(method.price) === 0)
        .map((method) => method.name);

    return <CartView freeShipping={freeShipping} alwaysFree={alwaysFree} />;
}

export default function CartPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <h1 className="text-3xl font-bold text-olive">Coșul de cumpărături</h1>
            <Suspense fallback={<p className="mt-8">Se încarcă...</p>}>
                <CartLoader />
            </Suspense>
        </main>
    );
}