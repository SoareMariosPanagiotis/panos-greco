import Link from "next/link";
import { MapPin, RotateCcw, Store, Truck } from "lucide-react";
import type { DeliveryHints } from "@/app/cos/actions";
import { formatPrice } from "@/lib/catalog";

// Sub butonul de coș, ca la magazinele mari: răspunsurile la „cât costă livrarea?” și
// „dacă nu-mi place?”, înainte să le caute clientul. Pragul de livrare gratuită și metodele
// gratuite vin din baza de date (le schimbi din admin), deci textul rămâne mereu adevărat.
export function ProductPerks({ hints }: { hints: DeliveryHints }) {
    const free = hints.freeShipping;

    return (
        <ul className="mt-6 space-y-3 border-t pt-5 text-sm text-neutral-700">
            <li className="flex items-start gap-3">
                <Truck className="mt-0.5 size-5 shrink-0 text-olive" />
                <span>
                    {free ? (
                        <>
                            <strong className="font-semibold text-neutral-900">
                                Livrare gratuită de la {formatPrice(String(free.over))}
                            </strong>
                            <span className="block text-neutral-500">prin curier, în toată țara</span>
                        </>
                    ) : (
                        <strong className="font-semibold text-neutral-900">Livrare prin curier în toată țara</strong>
                    )}
                </span>
            </li>
            {hints.alwaysFree.map((name) => {
                const Icon = /ridic/i.test(name) ? Store : MapPin;
                return (
                    <li key={name} className="flex items-start gap-3">
                        <Icon className="mt-0.5 size-5 shrink-0 text-olive" />
                        <span>
                            <strong className="font-semibold text-neutral-900">{name}</strong>: gratuit
                        </span>
                    </li>
                );
            })}
            <li className="flex items-start gap-3">
                <RotateCcw className="mt-0.5 size-5 shrink-0 text-olive" />
                <span>
                    <strong className="font-semibold text-neutral-900">Retur în 14 zile</strong>
                    <Link href="/retur" className="block text-neutral-500 underline-offset-2 hover:text-olive hover:underline">
                        cum funcționează returul
                    </Link>
                </span>
            </li>
        </ul>
    );
}
