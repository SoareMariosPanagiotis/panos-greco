import Link from "next/link";
import { getImageProps } from "next/image";
import { BadgeCheck, Store, Truck } from "lucide-react";

// Bannerul mare din pagina principală: poza cu gama de ulei, iar peste ea titlul și butoanele.
//
// Două poze, după ecran („art direction”): pe calculator una lată (produsele în dreapta, loc pentru
// text în stânga), pe telefon una înaltă (produsele jos, textul sus). <picture> lasă browserul să o
// aleagă pe cea potrivită și o descarcă doar pe aceea. getImageProps îi dă fiecăreia variantele
// micșorate de next/image, deci telefonul nu descarcă poza de 2400 px.
//
// Textul nu e „lipit” în poză: e HTML. Așa rămâne clar pe orice ecran, îl citește Google
// și îl poți schimba oricând fără să refaci poza.

const ALT =
    "Uleiul de măsline extravirgin bio Panos Greco: sticle de 250 ml, 500 ml, 1 l și canistra de 3 l, " +
    "pe o masă de piatră, în lumina soarelui";

// Culoarea peretelui din poze (măsurată), ca fundalul textului să se „topească” în poză
const WALL = "#e2caa6";

export function HomeHero() {
    const common = { alt: ALT, sizes: "100vw" };
    const {
        props: { srcSet: wide },
    } = getImageProps({ ...common, width: 2400, height: 1000, src: "/banner/gama-ulei-lat.jpg" });
    const {
        props: { srcSet: tall, ...img },
    } = getImageProps({
        ...common,
        width: 1200,
        height: 1500,
        src: "/banner/gama-ulei-vertical.jpg",
        loading: "eager", // e primul lucru văzut: îl încărcăm imediat (LCP)
        fetchPriority: "high",
    });

    return (
        <section className="relative overflow-hidden" style={{ backgroundColor: WALL }}>
            <picture>
                <source media="(min-width: 768px)" srcSet={wide} />
                {/* eslint-disable-next-line jsx-a11y/alt-text -- alt vine din getImageProps */}
                <img
                    {...img}
                    srcSet={tall}
                    className="block aspect-[4/5] w-full object-cover object-bottom md:aspect-auto md:h-[440px] md:object-[78%_100%] lg:h-[520px] xl:h-[600px]"
                />
            </picture>

            {/* Un văl în culoarea peretelui, dinspre text spre produse: textul se citește oricât de îngust e ecranul */}
            <div
                className="pointer-events-none absolute inset-0 md:hidden"
                style={{ background: `linear-gradient(to bottom, ${WALL}f2 0%, ${WALL}cc 32%, ${WALL}00 58%)` }}
            />
            <div
                className="pointer-events-none absolute inset-0 hidden md:block"
                style={{ background: `linear-gradient(to right, ${WALL}f5 0%, ${WALL}d9 34%, ${WALL}00 58%)` }}
            />

            <div className="absolute inset-0">
                <div className="mx-auto flex h-full max-w-6xl items-start px-4 pt-7 sm:px-8 md:items-center md:pt-0">
                    <div className="max-w-md text-neutral-900 lg:max-w-lg">
                        <p className="text-xs font-semibold tracking-[0.18em] text-olive uppercase sm:text-sm">
                            Din livada familiei · Messinia, Grecia
                        </p>
                        <h1 className="mt-2 text-[1.7rem] leading-tight font-bold text-balance sm:text-4xl lg:text-5xl">
                            Ulei de măsline extravirgin bio, presat la rece
                        </h1>
                        <p className="mt-3 text-[0.95rem] leading-relaxed text-neutral-700 sm:text-lg">
                            Nefiltrat, din măslinele livezii noastre de lângă Kalamata. Direct de la producător.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link
                                href="/produse/ulei-de-masline-extravirgin-bio"
                                className="rounded-full bg-olive px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-olive/90 sm:text-base"
                            >
                                Descoperă uleiul
                            </Link>
                            <Link
                                href="#produse"
                                className="rounded-full border border-olive/40 bg-white/60 px-6 py-3 text-sm font-semibold text-olive backdrop-blur transition hover:bg-white sm:text-base"
                            >
                                Toate produsele
                            </Link>
                        </div>
                        {/* Motive de încredere: scurte, adevărate, ușor de citit dintr-o privire */}
                        <ul className="mt-6 hidden flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-700 md:flex">
                            <li className="flex items-center gap-1.5">
                                <BadgeCheck className="size-4 text-olive" /> Certificat bio
                            </li>
                            <li className="flex items-center gap-1.5">
                                <Truck className="size-4 text-olive" /> Livrare în toată țara
                            </li>
                            <li className="flex items-center gap-1.5">
                                <Store className="size-4 text-olive" /> Magazin în Galați
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
