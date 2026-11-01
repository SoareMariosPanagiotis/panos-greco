import { Fragment, type ReactNode } from "react";

// Informațiile de pe etichetă, pe pagina produsului (migrația 025).
// La vânzarea online, clientul trebuie să le vadă înainte să cumpere (Regulamentul UE 1169/2011, art. 14).

type Nutrition = {
    basis: string;
    energyKj: string;
    energyKcal: string;
    fat: string;
    saturates: string;
    carbohydrate: string;
    sugars: string;
    fibre: string | null;
    protein: string;
    salt: string;
};

export type ProductLabelData = {
    ingredients: string | null;
    mayContain: string | null;
    storage: string | null;
    usageNotes: string | null;
    origin: string | null;
    producer: string | null;
    organicCode: string | null;
    labelNotes: string | null;
    productNutritionByProductId: Nutrition | null;
};

export const PRODUCT_LABEL_FIELDS = `
  ingredients mayContain storage usageNotes origin producer organicCode labelNotes
  productNutritionByProductId {
    basis energyKj energyKcal fat saturates carbohydrate sugars fibre protein salt
  }
`;

// „făină de *grâu*, *susan*” → alergenii îngroșați, cum cere legea
function Ingredients({ text }: { text: string }) {
    const parts = text.split(/(\*[^*]+\*)/g);
    return (
        <>
            {parts.map((part, index) =>
                part.length > 2 && part.startsWith("*") && part.endsWith("*") ? (
                    <strong key={index}>{part.slice(1, -1)}</strong>
                ) : (
                    <Fragment key={index}>{part}</Fragment>
                ),
            )}
        </>
    );
}

// „91.60” → „91,6”
function amount(value: string) {
    return Number(value).toLocaleString("ro-RO", { maximumFractionDigits: 2 });
}

function NutritionTable({ nutrition }: { nutrition: Nutrition }) {
    const rows: [string, string, boolean?][] = [
        ["Energie", `${amount(nutrition.energyKj)} kJ / ${amount(nutrition.energyKcal)} kcal`],
        ["Grăsimi", `${amount(nutrition.fat)} g`],
        ["din care acizi grași saturați", `${amount(nutrition.saturates)} g`, true],
        ["Glucide", `${amount(nutrition.carbohydrate)} g`],
        ["din care zaharuri", `${amount(nutrition.sugars)} g`, true],
        ...(nutrition.fibre !== null ? [["Fibre", `${amount(nutrition.fibre)} g`] as [string, string]] : []),
        ["Proteine", `${amount(nutrition.protein)} g`],
        ["Sare", `${amount(nutrition.salt)} g`],
    ];

    return (
        <table className="h-fit w-full overflow-hidden rounded-xl border bg-white text-sm">
            <caption className="pb-2 text-left font-semibold">Valori nutriționale medii la {nutrition.basis}</caption>
            <tbody className="divide-y">
                {rows.map(([label, value, indented]) => (
                    <tr key={label}>
                        <th scope="row" className={`px-4 py-2 text-left font-normal ${indented ? "pl-8 text-neutral-500" : ""}`}>
                            {label}
                        </th>
                        <td className="whitespace-nowrap px-4 py-2 text-right">{value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export function ProductLabel({ label, sizes }: { label: ProductLabelData; sizes: string[] }) {
    const rows: [string, ReactNode][] = [];
    if (label.ingredients) rows.push(["Ingrediente", <Ingredients key="i" text={label.ingredients} />]);
    if (label.mayContain) rows.push(["Poate conține urme de", label.mayContain]);
    const nutrition = label.productNutritionByProductId;

    // Fără nimic completat în admin, secțiunea nu apare
    const hasText = [label.storage, label.usageNotes, label.origin, label.producer, label.organicCode, label.labelNotes].some(
        Boolean,
    );
    if (rows.length === 0 && !hasText && !nutrition) return null;

    if (sizes.length > 0) rows.push(["Cantitate netă", sizes.join(" / ")]);
    if (label.storage) rows.push(["Mod de păstrare", label.storage]);
    if (label.usageNotes) rows.push(["Mod de folosire", label.usageNotes]);
    if (label.origin) rows.push(["Țara de origine", label.origin]);
    if (label.producer) rows.push(["Producător", label.producer]);
    if (label.organicCode) rows.push(["Cod organism de control bio", label.organicCode]);
    if (label.labelNotes) rows.push(["Alte mențiuni", label.labelNotes]);

    return (
        <section className="mt-16 border-t pt-10">
            <h2 className="text-2xl font-bold text-olive">Informații despre produs</h2>
            <div className="mt-6 grid gap-8 md:grid-cols-[1fr_340px]">
                <dl className="divide-y rounded-xl border bg-white px-6 text-sm">
                    {rows.map(([term, value]) => (
                        <div key={term} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
                            <dt className="text-neutral-500">{term}</dt>
                            <dd className="whitespace-pre-line text-neutral-800">{value}</dd>
                        </div>
                    ))}
                </dl>
                {nutrition && <NutritionTable nutrition={nutrition} />}
            </div>
        </section>
    );
}
