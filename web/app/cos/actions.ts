"use server";

import { gql } from "@/lib/catalog";

export type DeliveryHints = {
    freeShipping: { over: number; method: string } | null;
    alwaysFree: string[];
};

const query = `
  query DeliveryHints {
    allDeliveryMethods(orderBy: SORT_ORDER_ASC) {
      nodes { name price freeOver }
    }
  }
`;

type Method = { name: string; price: string; freeOver: string | null };

// Pragul de livrare gratuită și metodele mereu gratuite, citite din baza de date.
// Folosit de pagina coșului și de coșul care se deschide din lateral.
export async function getDeliveryHints(): Promise<DeliveryHints> {
    // Dacă API-ul nu răspunde, coșul merge oricum, doar fără mesajul despre livrare
    const data = await gql<{ allDeliveryMethods: { nodes: Method[] } }>(query).catch(() => null);
    const methods = data?.allDeliveryMethods.nodes ?? [];

    // Metoda cu plată care are cel mai mic prag de livrare gratuită (la noi: curierul)
    const withThreshold = methods
        .filter((method) => Number(method.price) > 0 && method.freeOver !== null)
        .sort((a, b) => Number(a.freeOver) - Number(b.freeOver));
    const first = withThreshold[0];

    return {
        freeShipping: first ? { over: Number(first.freeOver), method: first.name } : null,
        alwaysFree: methods.filter((method) => Number(method.price) === 0).map((method) => method.name),
    };
}