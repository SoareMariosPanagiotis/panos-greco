import { Suspense } from "react";
import {
    CheckoutForm,
    type CheckoutAccount,
    type DeliveryOption,
    type PaymentOption,
} from "@/components/checkout/checkout-form";
import { getSession } from "@/lib/auth";
import { gql } from "@/lib/catalog";
import { getMyAddresses } from "@/lib/customer";

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

// Clientul conectat: îi completăm formularul cu datele din cont
async function loadAccount(): Promise<CheckoutAccount | null> {
    const session = await getSession();
    if (!session || session.user.role !== "client") return null; // vizitator sau admin

    const { user, token } = session;
    // Dacă adresele nu se pot încărca, comanda merge mai departe fără ele
    const addresses = await getMyAddresses(token).catch(() => []);
    return {
        lastName: user.lastName ?? "",
        firstName: user.firstName ?? "",
        email: user.email,
        phone: user.phone ?? "",
        addresses,
    };
}

async function CheckoutLoader() {
    // Metodele le cerem FĂRĂ bilet: ca vizitator vezi doar metodele active
    // (cu biletul de admin le-ai vedea și pe cele oprite)
    const [data, account] = await Promise.all([
        gql<{
            allDeliveryMethods: { nodes: DeliveryOption[] };
            allPaymentMethods: { nodes: PaymentOption[] };
        }>(query),
        loadAccount(),
    ]);

    return (
        <CheckoutForm
            deliveryOptions={data.allDeliveryMethods.nodes}
            paymentOptions={data.allPaymentMethods.nodes}
            account={account}
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