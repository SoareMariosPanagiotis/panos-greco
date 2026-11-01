import { HandCoins, MailCheck, MousePointerClick, PackageOpen } from "lucide-react";

// Returul, în 4 pași. Același desen pe pagina „Politica de retur” și pe formularul de retur.
const STEPS = [
    {
        icon: MousePointerClick,
        title: "Completezi formularul",
        text: "Alegi comanda și produsele, apoi confirmi. Merge și fără cont.",
    },
    {
        icon: MailCheck,
        title: "Primești confirmarea",
        text: "Pe email, imediat: cererea ta, cu data și ora la care ai trimis-o.",
    },
    {
        icon: PackageOpen,
        title: "Ne trimiți produsele",
        text: "În cel mult 14 zile, sigilate, la adresa din confirmare. Transportul e al tău.",
    },
    {
        icon: HandCoins,
        title: "Îți returnăm banii",
        text: "În cel mult 14 zile de la cerere, după ce primim produsele sau dovada că le-ai trimis.",
    },
];

export function ReturnSteps() {
    return (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
                <li key={step.title} className="relative rounded-xl border bg-white p-5">
                    <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-olive text-sm font-bold text-white">
                            {index + 1}
                        </span>
                        <step.icon className="size-5 text-olive" aria-hidden />
                    </div>
                    <h3 className="mt-3 font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{step.text}</p>
                </li>
            ))}
        </ol>
    );
}
