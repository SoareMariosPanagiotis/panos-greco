import { Suspense } from "react";
import {
    CheckoutForm,
    type DeliveryOption,
    type PaymentOption,
} from "@/components/checkout/checkout-form";
import { gql } from "@/lib/catalog";

// Doar metodele ACTIVE ajung aici: RLS le ascunde pe celelalte de vizitatori
const query = `
  query CheckoutOptions {
    allDeliveryMethods(orderBy: SORT_ORDER_ASC) {
      nodes { code name description price freeOver needsAddress city }
    }
    allPaymentMethods(orderBy: SORT_ORDER_ASC) {
      nodes { code name description fee }
    }
  }
`;

async function CheckoutLoader() {
    const data = await gql<{
        allDeliveryMethods: { nodes: DeliveryOption[] };
        allPaymentMethods: { nodes: PaymentOption[] };
    }>(query);

    return (
        <CheckoutForm
            deliveryOptions={data.allDeliveryMethods.nodes}
            paymentOptions={data.allPaymentMethods.nodes}
        />
    );
}

export default function CheckoutPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-8 py-10">
            <h1 className="text-3xl font-bold text-olive">Finalizează comanda</h1>
            <Suspense fallback={<p className="mt-8">Se încarcă...</p>}>
                <CheckoutLoader />
            </Suspense>
        </main>
    );
}