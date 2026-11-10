import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Lora } from "next/font/google";
import { ArrowRight, Clock, Droplet, Leaf, Snowflake } from "lucide-react";
import { GreekFlag } from "@/components/greek-flag";
import { RomanianFlag } from "@/components/romanian-flag";
import { ORGANIC_CERTIFICATE_PATH } from "@/lib/organic-certificate";

// Pagina „Despre noi”: povestea familiei, spusă scurt, ca la un brand mare.
// Ordinea urmează drumul cititorului: cârligul (o frază), vocea tatălui (citatul din pliantul lui),
// cine ce face, cum se face uleiul, apoi invitația să-l guste.
//
// Ce NU scriem, intenționat:
// - beneficii pentru sănătate („scade colesterolul”, „protejează ficatul”): în UE, pe alimente sunt permise
//   doar mențiunile aprobate (Regulamentul (CE) 1924/2006 și (UE) 432/2012);
// - „presat la rece”: uleiul se scoate cu decantor (centrifugare), iar pentru asta termenul legal e
//   „extracție la rece” (Regulamentul (UE) 29/2012, art. 5);
// - „singurii” sau „cei mai buni”: o laudă pe care n-o poți dovedi e reclamă înșelătoare.
//   Povestea arată singură că suntem altfel.

// Litera cu serife a poveștii, aceeași ca pe pozele cu avantajele uleiului. O încărcăm doar aici:
// next/font o descarcă la build și o servește de pe site-ul nostru, deci restul paginilor nu o așteaptă.
const lora = Lora({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-lora" });

export const metadata: Metadata = {
    title: "Despre noi · Panos Greco",
    description:
        "Tata a plecat din Focșani acum aproape 30 de ani, a ajuns producător de ulei de măsline bio în Grecia, iar acum uleiul lui vine acasă, în România.",
};

const OIL = "/produse/ulei-de-masline-extravirgin-bio";

const STEPS = [
    { icon: Leaf, title: "Culegem", text: "Măslinele vin din livada noastră, certificată bio din 2015." },
    { icon: Clock, title: "Repede la moară", text: "În aceeași zi sau în cel mult 24 de ore, cât sunt proaspete." },
    { icon: Snowflake, title: "Extras la rece", text: "Doar mecanic: spălare, extracție la rece, decantare și centrifugare." },
    { icon: Droplet, title: "Nefiltrat", text: "Rămâne cu gustul și aroma fructului proaspăt." },
];

// Unde vezi <span className="whitespace-nowrap">: „s-a”, „m-am”, „de-a” nu se rup pe două rânduri la cratimă.
const eyebrow = "text-xs font-semibold tracking-[0.18em] text-olive uppercase sm:text-sm";
const heading = "mt-3 font-serif text-3xl leading-tight font-semibold text-balance text-neutral-900 sm:text-4xl";

export default function AboutPage() {
    return (
        <main className={`${lora.variable} flex-1`}>
            {/* 1. Cârligul: toată povestea într-o frază, apoi pe scurt */}
            <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-8 md:grid-cols-[1fr_380px] md:py-16 lg:grid-cols-[1fr_440px] lg:gap-16">
                <div>
                    <p className={`flex items-center gap-2 ${eyebrow}`}>
                        <RomanianFlag className="h-3 w-[18px] shrink-0" />
                        <GreekFlag className="h-3 w-[18px] shrink-0" />
                        Povestea noastră
                    </p>
                    <h1 className="mt-4 font-serif text-4xl leading-[1.1] font-semibold text-balance text-neutral-900 sm:text-5xl lg:text-6xl">
                        Tata a plecat din România. Uleiul lui <span className="whitespace-nowrap">s-a</span> întors acasă.
                    </h1>
                    <div className="mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-neutral-700">
                        <p>
                            Acum aproape 30 de ani, tata a plecat din Focșani să muncească în Grecia. Eu{" "}
                            <span className="whitespace-nowrap">m-am</span> născut acolo.
                        </p>
                        <p>
                            Azi el are grijă de livada noastră din Peloponez, iar eu aduc uleiul acasă, în România. Direct de
                            la noi, pe masa ta.
                        </p>
                    </div>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={OIL}
                            className="inline-flex items-center gap-2 rounded-full bg-olive px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-olive/90 sm:text-base"
                        >
                            Gustă uleiul nostru
                            <ArrowRight className="size-4" />
                        </Link>
                        <Link
                            href={ORGANIC_CERTIFICATE_PATH}
                            className="rounded-full border border-olive/40 bg-white/60 px-6 py-3 text-sm font-semibold text-olive transition hover:bg-white sm:text-base"
                        >
                            Vezi certificatul bio
                        </Link>
                    </div>
                </div>
                {/* Până vin pozele din livadă: gama de ulei, aceeași poză ca în banner */}
                <Image
                    src="/banner/gama-ulei-vertical.jpg"
                    alt="Uleiul de măsline extravirgin bio Panos Greco, în sticle de 250 ml, 500 ml și 1 l și în cutia de 3 l"
                    width={1200}
                    height={1500}
                    sizes="(min-width: 1024px) 440px, (min-width: 768px) 380px, 100vw"
                    loading="eager"
                    fetchPriority="high"
                    className="aspect-[4/5] w-full rounded-2xl object-cover"
                />
            </section>

            {/* 2. Vocea tatălui: cuvintele lui, din pliantul lui de prezentare */}
            <section className="border-y bg-white">
                <figure className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-8 sm:py-20">
                    <blockquote className="font-serif text-2xl leading-relaxed text-neutral-800 italic sm:text-3xl">
                        „Am început ca simplu muncitor pe plantațiile de măslini. Am învățat totul{" "}
                        <span className="whitespace-nowrap">de-a</span> lungul anilor,
                        punând suflet și pasiune. Acum vă vorbesc ca producător.”
                    </blockquote>
                    <figcaption className={`mt-6 ${eyebrow}`}>Toader Soare · producător</figcaption>
                </figure>
            </section>

            {/* 3. Cine ce face: o familie în două țări */}
            <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
                <p className={eyebrow}>O familie, două țări</p>
                <h2 className={heading}>Tata în livadă. Eu la magazin.</h2>

                {/* Drumul uleiului, desenat: livada → linie punctată → magazinul */}
                <div className="mt-8 flex items-center gap-2 text-xs font-medium text-neutral-900 sm:gap-3 sm:text-sm">
                    <span className="flex shrink-0 items-center gap-2">
                        <GreekFlag className="h-3 w-[18px] sm:h-4 sm:w-6" />
                        Livada, Grecia
                    </span>
                    <span className="relative flex-1 border-t-2 border-dashed border-olive/40">
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-olive-light px-2 text-xs whitespace-nowrap text-neutral-500">
                            peste 1.500 km
                        </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                        Magazinul, Galați
                        <RomanianFlag className="h-3 w-[18px] sm:h-4 sm:w-6" />
                    </span>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    <article className="rounded-2xl border bg-white p-6 sm:p-8">
                        <GreekFlag className="h-6 w-9" />
                        <h3 className="mt-4 font-serif text-2xl font-semibold text-neutral-900">Toader, în Grecia</h3>
                        <p className="mt-2 leading-relaxed text-neutral-700">
                            Are grijă de livadă tot anul și face uleiul așa cum a învățat în aproape 30 de ani de muncă.
                        </p>
                    </article>
                    <article className="rounded-2xl border bg-white p-6 sm:p-8">
                        <RomanianFlag className="h-6 w-9" />
                        <h3 className="mt-4 font-serif text-2xl font-semibold text-neutral-900">Marios, în România</h3>
                        <p className="mt-2 leading-relaxed text-neutral-700">
                            M-am născut în Grecia și am luat bacul acolo. Acum sunt la Galați: mă ocup de magazin, de
                            comenzi, de facturi și de tot ce ține de voi.
                        </p>
                    </article>
                </div>
            </section>

            {/* 4. Cum se face uleiul: patru pași, aceleași iconițe ca pe pozele produsului */}
            <section className="border-y bg-white">
                <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
                    <p className={eyebrow}>De la pom la sticlă</p>
                    <h2 className={heading}>Vrem să știi exact ce e în sticlă</h2>
                    <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {STEPS.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <li key={step.title}>
                                    <span className="flex size-12 items-center justify-center rounded-full bg-olive text-white">
                                        <Icon className="size-5" />
                                    </span>
                                    <h3 className="mt-4 font-semibold text-neutral-900">
                                        <span className="mr-1.5 text-olive">{index + 1}.</span>
                                        {step.title}
                                    </h3>
                                    <p className="mt-1 leading-relaxed text-neutral-600">{step.text}</p>
                                </li>
                            );
                        })}
                    </ol>
                    <p className="mt-10 text-sm text-neutral-600">
                        Livada e certificată bio din 2015 și e controlată de DIO (GR-BIO-01).{" "}
                        <Link href={ORGANIC_CERTIFICATE_PATH} className="font-medium text-olive underline underline-offset-2">
                            Vezi certificatul
                        </Link>
                    </p>
                </div>
            </section>

            {/* 5. Invitația */}
            <section className="bg-olive text-white">
                <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-8 sm:py-20">
                    <h2 className="font-serif text-3xl leading-tight font-semibold text-balance sm:text-4xl">
                        Uleiul familiei noastre, pe masa ta
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
                        Îl trimitem în toată țara. Sau treci pe la magazinul nostru din Galați.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link
                            href={OIL}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-olive transition hover:bg-olive-light sm:text-base"
                        >
                            Comandă uleiul
                            <ArrowRight className="size-4" />
                        </Link>
                        <Link
                            href="/contact"
                            className="rounded-full border border-white/50 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:text-base"
                        >
                            Unde ne găsești
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
