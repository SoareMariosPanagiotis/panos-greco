import { Suspense } from "react";
import Link from "next/link";
import {
    DeliveryMethodForm,
    PaymentMethodForm,
    type AdminDeliveryMethod,
    type AdminPaymentMethod,
} from "@/components/admin/method-forms";
import { requireAdmin } from "@/lib/auth";
import { gql } from "@/lib/catalog";

// Adminul vede și metodele oprite (politica RLS de admin), clienții doar pe cele active
const query = `
  query AdminMethods {
    allDeliveryMethods(orderBy: SORT_ORDER_ASC) {
      nodes { id code name description price freeOver needsAddress needsAwb city isActive sortOrder }
    }
    allPaymentMethods(orderBy: SORT_ORDER_ASC) {
      nodes { id code name description fee isActive sortOrder }
    }
  }
`;

async function MethodsEditor() {
    const { token } = await requireAdmin();
    const data = await gql<{
        allDeliveryMethods: { nodes: AdminDeliveryMethod[] };
        allPaymentMethods: { nodes: AdminPaymentMethod[] };
    }>(query, {}, token);

    return (
        <>
            <h2 className="mt-8 text-xl font-semibold">Metode de livrare</h2>
            <p className="mt-1 text-sm text-neutral-500">
                Prețurile includ TVA. Lasă „Gratuit peste” gol dacă livrarea nu devine niciodată gratuită.
            </p>
            <div className="mt-3 rounded-xl border bg-white">
                {data.allDeliveryMethods.nodes.map((method) => (
                    <DeliveryMethodForm key={method.id} method={method} />
                ))}
            </div>

            <h2 className="mt-10 text-xl font-semibold">Metode de plată</h2>
            <p className="mt-1 text-sm text-neutral-500">
                Taxa se adaugă la totalul comenzii. Pune 0 dacă nu vrei nicio taxă.
            </p>
            <div className="mt-3 rounded-xl border bg-white">
                {data.allPaymentMethods.nodes.map((method) => (
                    <PaymentMethodForm key={method.id} method={method} />
                ))}
            </div>
        </>
    );
}

export default function AdminMethodsPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <Link href="/admin" className="text-sm text-olive hover:underline">
                ← Administrare
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-olive">Livrare și plată</h1>
            <Suspense fallback={<p className="mt-6">Se încarcă setările...</p>}>
                <MethodsEditor />
            </Suspense>
        </main>
    );
}