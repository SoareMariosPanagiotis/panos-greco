import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Store, Truck } from "lucide-react";
import { getDeliveryHints, type DeliveryHints } from "@/app/cos/actions";
import { GreekFlag } from "@/components/greek-flag";
import { formatPrice } from "@/lib/catalog";
import { ORGANIC_CERTIFICATE as cert, ORGANIC_CERTIFICATE_PATH } from "@/lib/organic-certificate";

// Banda de sub banner: patru motive să cumperi de la noi, citite dintr-o privire, ca la magazinele mari.
// Telefon: două coloane, pictograma deasupra textului. Tabletă și laptop mic: patru coloane, tot așa.
// Ecran lat (xl, de la 1280 px): patru coloane cu pictograma în stânga; abia acolo încape textul pe un rând.
//
// Lângă sigla bio a UE stau codul și „Agricultură Grecia” (Regulamentul (UE) 2018/848, art. 32), iar textul
// spune clar „Ulei”: celelalte produse din magazin nu sunt bio. Livrarea vine din baza de date (pragul de
// livrare gratuită îl schimbi din admin), deci o așteptăm separat, în Suspense: restul benzii apare imediat.

const item = "flex flex-col items-center gap-2 text-center xl:flex-row xl:gap-3 xl:text-left";
const visual = "flex h-9 w-[54px] shrink-0 items-center justify-center";
const title = "block text-sm font-semibold text-neutral-900";
const sub = "block text-xs leading-snug text-neutral-600";

// hints = null cât se încarcă: rândul al doilea e gol, dar își păstrează locul, ca pagina să nu sară
function DeliveryItems({ hints }: { hints: DeliveryHints | null }) {
    const free = hints?.freeShipping;
    const pickup = hints?.alwaysFree.some((name) => /ridic/i.test(name)) ?? false;
    const placeholder = <span className={`${sub} invisible`}>…</span>;

    return (
        <>
            <li className={item}>
                <span className={visual}>
                    <Truck className="size-6 text-olive" />
                </span>
                <span>
                    <span className={title}>Livrare în toată țara</span>
                    {hints ? (
                        <span className={sub}>{free ? `gratuită de la ${formatPrice(String(free.over))}` : "prin curier"}</span>
                    ) : (
                        placeholder
                    )}
                </span>
            </li>
            <li className={item}>
                <span className={visual}>
                    <Store className="size-6 text-olive" />
                </span>
                <span>
                    <span className={title}>Magazin în Galați</span>
                    {hints ? pickup && <span className={sub}>ridicare gratuită</span> : placeholder}
                </span>
            </li>
        </>
    );
}

async function LiveDeliveryItems() {
    return <DeliveryItems hints={await getDeliveryHints()} />;
}

export function TrustStrip() {
    return (
        <section aria-label="Pe scurt despre noi" className="border-b bg-white">
            {/* Pe calculator: linii subțiri între coloane (divide-x) și spațiu egal de o parte și de alta */}
            <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-3 gap-y-6 px-4 py-6 sm:px-8 md:grid-cols-4 md:gap-x-0 md:divide-x md:[&>li]:px-4 xl:[&>li]:px-6 xl:[&>li:first-child]:pl-0 xl:[&>li:last-child]:pr-0">
                <li>
                    <Link href={ORGANIC_CERTIFICATE_PATH} className={`group ${item}`}>
                        <Image
                            src="/bio/sigla-bio-ue.png"
                            alt="Logoul de producție ecologică al Uniunii Europene"
                            width={54}
                            height={36}
                            className="h-9 w-[54px] shrink-0"
                        />
                        <span>
                            <span className={`${title} group-hover:text-olive`}>
                                Ulei certificat bio
                                <ChevronRight className="ml-0.5 inline size-3.5 align-[-2px] transition-transform group-hover:translate-x-0.5" />
                            </span>
                            {/* Codul deasupra țării, ca pe etichetă */}
                            <span className="block text-xs leading-snug font-medium text-neutral-800">{cert.controlBodyCode}</span>
                            <span className={sub}>Agricultură {cert.origin}</span>
                        </span>
                    </Link>
                </li>
                <li className={item}>
                    <span className={visual}>
                        <GreekFlag className="h-6 w-9" />
                    </span>
                    <span>
                        <span className={title}>Din livada familiei</span>
                        <span className={sub}>Messinia, Grecia</span>
                    </span>
                </li>
                <Suspense fallback={<DeliveryItems hints={null} />}>
                    <LiveDeliveryItems />
                </Suspense>
            </ul>
        </section>
    );
}
