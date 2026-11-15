import { Droplet } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { GreekFlag } from "@/components/greek-flag";
import { Reveal } from "@/components/reveal";
import { RomanianFlag } from "@/components/romanian-flag";

// Drumul uleiului, desenat: livada din Grecia → magazinul din Galați.
// Când ajungi la el, linia se umple de la stânga la dreapta, picătura de ulei merge odată cu ea,
// iar kilometrii numără până la 1.500. Toate trei durează la fel (2,4 s), ca să pară o singură mișcare.
// Desenul și animația sunt în globals.css (.oil-route-…); aici e doar structura.
export function OilRoute({ className = "" }: { className?: string }) {
    return (
        <Reveal variant="route" className={className}>
            <div className="flex items-center gap-3 text-xs font-medium text-neutral-900 sm:gap-4 sm:text-sm">
                <span className="flex shrink-0 items-center gap-2">
                    <GreekFlag className="h-3 w-[18px] sm:h-4 sm:w-6" />
                    Livada, Grecia
                </span>
                <span className="oil-route-track" aria-hidden="true">
                    <span className="oil-route-fill" />
                    <span className="oil-route-drop">
                        <Droplet className="size-3.5 fill-oil text-oil" />
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                    Magazinul, Galați
                    <RomanianFlag className="h-3 w-[18px] sm:h-4 sm:w-6" />
                </span>
            </div>
            <p className="mt-4 text-center text-sm text-neutral-600">
                peste <CountUp value={1500} className="font-serif text-2xl font-semibold text-neutral-900 sm:text-3xl" /> km, din
                livadă până la tine
            </p>
        </Reveal>
    );
}
