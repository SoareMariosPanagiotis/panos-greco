"use server";

import { gql } from "@/lib/catalog";
import { COUNTIES } from "@/lib/counties";

// Localitățile unui județ, din tabelul sales.localities (SIRUTA, migrația 019).
// E o acțiune de server ca s-o poată cere formularul din browser când alegi județul.

export type Locality = { label: string; isUrban: boolean };

const localitiesQuery = `
  query Localities($county: String!) {
    allLocalities(condition: { county: $county }) {
      nodes { label isUrban }
    }
  }
`;

// Ordinea alfabetului românesc (Ă după A, Ș după S), nu ordinea „calculatorului”
const romanian = new Intl.Collator("ro");

export async function getLocalities(county: string): Promise<Locality[]> {
    if (!COUNTIES.includes(county)) return [];

    const data = await gql<{ allLocalities: { nodes: Locality[] } }>(localitiesQuery, { county });
    return data.allLocalities.nodes.sort((a, b) => romanian.compare(a.label, b.label));
}
