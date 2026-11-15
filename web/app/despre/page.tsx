import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Lora } from "next/font/google";
import { ArrowRight } from "lucide-react";
import { GreekFlag } from "@/components/greek-flag";
import { OilRoute } from "@/components/oil-route";
import { Reveal } from "@/components/reveal";
import { RomanianFlag } from "@/components/romanian-flag";
import { Words } from "@/components/words";
import { ORGANIC_CERTIFICATE_PATH } from "@/lib/organic-certificate";

// Pagina „Despre noi”: povestea familiei, spusă scurt, ca la un brand mare.
// Ordinea urmează drumul cititorului: cârligul (o frază), vocea tatălui (citatul din pliantul lui),
// livada, cine ce face, cum se face uleiul, câteva imagini, apoi invitația să-l guste.
//
// Pozele sunt din albumul familiei (Foto banner/Despre noi), decupate și aduse la același ton, fără
// datele EXIF (deci fără locația din telefon). Stau în web/public/despre.
//
// Ce NU scriem, intenționat:
// - beneficii pentru sănătate („scade colesterolul”, „protejează ficatul”): în UE, pe alimente sunt permise
//   doar mențiunile aprobate (Regulamentul (CE) 1924/2006 și (UE) 432/2012);
// - „presat la rece”: uleiul se scoate cu decantor (centrifugare), iar pentru asta termenul legal e
//   „extracție la rece” (Regulamentul (UE) 29/2012, art. 5);
// - „singurii” sau „cei mai buni”: o laudă pe care n-o poți dovedi e reclamă înșelătoare.
//   Povestea arată singură că suntem altfel.

// Litera cu serife (Lora) vine din app/layout.tsx, pentru tot site-ul, dar numai dreaptă. Aici avem
// și citatul tatălui, scris cursiv, așa că pagina asta o încarcă și în varianta cursivă.
const lora = Lora({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-lora" });

// Citatul tatălui. Îl ținem ca text, ca să-l putem împărți în cuvinte (vezi secțiunea 2).
const QUOTE =
    "„Am început ca simplu muncitor pe plantațiile de măslini. Ani la rând am învățat tot ce ține de cultivare " +
    "și de producție, cu suflet și cu pasiune. Astăzi sunt producător, iar uleiul meu poate ajunge pe masa dumneavoastră.”";

export const metadata: Metadata = {
    title: "Despre noi · Panos Greco",
    description:
        "Ulei grecesc, făcut de mâini românești: povestea familiei Soare, de la Focșani la livada din Peloponez și înapoi acasă, în România.",
};

const OIL = "/produse/ulei-de-masline-extravirgin-bio";

const STEPS = [
    {
        title: "Culesul",
        text: "Măslinele vin din livada noastră din Peloponez.",
        image: "/despre/pas-cules.jpg",
        alt: "Măslin bătrân la cules, cu scara sprijinită de trunchi și plasele întinse dedesubt",
    },
    {
        title: "La moară, în aceeași zi",
        text: "Ajung la moară în aceeași zi sau în cel mult 24 de ore, cât sunt încă proaspete.",
        image: "/despre/pas-moara.jpg",
        alt: "Măslinele intră în moară",
    },
    {
        title: "Extracție la rece",
        text: "Uleiul se obține doar mecanic, fără căldură și fără niciun tratament chimic.",
        image: "/despre/pas-extractie.jpg",
        alt: "Uleiul proaspăt curge din separatorul morii",
    },
    {
        title: "Nefiltrat",
        text: "Îl lăsăm așa cum iese din moară, cu gustul și aroma măslinei proaspete.",
        image: "/despre/pas-nefiltrat.jpg",
        alt: "Ulei nefiltrat, verde-auriu, curgând în bazin",
    },
];

const GALLERY = [
    { image: "/despre/galerie-masline-cer.jpg", alt: "Măsline verzi pe ramură, pe cerul albastru" },
    { image: "/despre/galerie-sticla-maslin.jpg", alt: "Sticlă de ulei Panos Greco în scorbura unui măslin bătrân" },
    { image: "/despre/galerie-masline-coapte.jpg", alt: "Măsline coapte, violet, pe ramură" },
    { image: "/despre/galerie-inima.jpg", alt: "Tăietură în formă de inimă pe o creangă de măslin" },
    { image: "/despre/galerie-trunchi.jpg", alt: "Trunchiul unui măslin bătrân" },
    { image: "/despre/galerie-maini.jpg", alt: "Mâini cu măsline proaspăt culese" },
];

// Unde vezi <span className="whitespace-nowrap">: „și-a” și „GR-BIO-01” nu se rup pe două rânduri la cratimă.
const eyebrow = "text-xs font-semibold tracking-[0.18em] text-olive uppercase sm:text-sm";
const heading = "mt-3 font-serif text-3xl leading-tight font-semibold text-balance text-neutral-900 sm:text-4xl";

export default function AboutPage() {
    return (
        <main className={`${lora.variable} flex-1`}>
            {/* 1. Cârligul: toată povestea într-o frază, apoi pe scurt */}
            <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-8 md:grid-cols-[1fr_380px] md:py-16 lg:grid-cols-[1fr_440px] lg:gap-16">
                <div>
                    <p className={`enter flex items-center gap-2 ${eyebrow}`}>
                        <RomanianFlag className="h-3 w-[18px] shrink-0" />
                        <GreekFlag className="h-3 w-[18px] shrink-0" />
                        Povestea noastră
                    </p>
                    <h1 className="mt-4 font-serif text-4xl leading-[1.1] font-semibold text-balance text-neutral-900 sm:text-5xl lg:text-6xl">
                        <Words text="Ulei grecesc, făcut de mâini românești." delay={150} />
                    </h1>
                    <div className="enter enter-1 mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-pretty text-neutral-700">
                        <p>
                            Acum aproape treizeci de ani, tata a plecat din Focșani spre Grecia. Acolo, printre măslinii din
                            Peloponez, <span className="whitespace-nowrap">și-a</span> construit o viață și o meserie.
                        </p>
                        <p>Astăzi, uleiul din livada noastră se întoarce acasă, în România.</p>
                    </div>
                    <div className="enter enter-2 mt-8 flex flex-wrap gap-3">
                        <Link
                            href={OIL}
                            className="btn-sheen inline-flex items-center gap-2 rounded-full bg-olive px-6 py-3 text-sm font-semibold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:text-base"
                        >
                            Descoperă uleiul
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
                {/* Poza se dezvelește de sus în jos (curtain-load) și, în același timp, se așază din puțin mărită */}
                <div className="curtain-load overflow-hidden rounded-2xl">
                    <Image
                        src="/despre/livada-cules.jpg"
                        alt="Măsline proaspăt culese pe plasele întinse sub măslinii din livada noastră"
                        width={1200}
                        height={1500}
                        sizes="(min-width: 1024px) 440px, (min-width: 768px) 380px, 100vw"
                        loading="eager"
                        fetchPriority="high"
                        className="hero-settle aspect-[4/5] w-full object-cover"
                    />
                </div>
            </section>

            {/* 2. Vocea tatălui, din pliantul lui de prezentare, lângă mâinile pline de măsline */}
            <section className="border-y bg-white">
                <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 sm:px-8 sm:py-20 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
                    {/* Pe telefon mai joasă (4 : 3), ca citatul să nu ajungă prea jos */}
                    <Reveal variant="curtain" className="overflow-hidden rounded-2xl">
                        <Image
                            src="/despre/maini-masline.jpg"
                            alt="Mâini pline de măsline verzi, proaspăt culese"
                            width={960}
                            height={1200}
                            sizes="(min-width: 768px) 40vw, 100vw"
                            className="aspect-[4/3] w-full object-cover md:aspect-[4/5]"
                        />
                    </Reveal>
                    <figure>
                        {/* Citatul se „scrie” pe măsură ce citești: fiecare cuvânt e un <span> care își știe
                            numărul (--i) din total (--n), iar regula .ink din globals.css îl întunecă atunci
                            când pagina a urcat cât îi vine rândul. Spațiile rămân text obișnuit. */}
                        <blockquote className="ink font-serif text-2xl leading-relaxed text-neutral-800 italic sm:text-3xl">
                            {QUOTE.split(" ").map((word, index, words) => (
                                <span key={index} style={{ "--i": index, "--n": words.length } as CSSProperties}>
                                    {word}
                                    {index < words.length - 1 && " "}
                                </span>
                            ))}
                        </blockquote>
                        <figcaption className={`mt-6 ${eyebrow}`}>Toader Soare · producător</figcaption>
                    </figure>
                </div>
            </section>

            {/* 3. Livada, pe toată lățimea: o pauză de la text. Poza e lată (2,4 : 1); pe telefon se taie marginile.
                overflow-clip, nu overflow-hidden: „hidden” ar face din ramă o zonă de scroll, iar animația pozei
                (parallax-zoom) s-ar lega de ea, nu de pagină, și ar sta pe loc. */}
            <div className="relative h-56 overflow-clip sm:h-80 lg:h-[28rem]">
                <Image
                    src="/despre/livada-panorama.jpg"
                    alt="Livada de măslini, cu măslinele proaspăt culese pe plase"
                    fill
                    sizes="100vw"
                    className="parallax-zoom object-cover"
                />
            </div>

            {/* 4. Cine ce face: o familie în două țări */}
            <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
                <p className={eyebrow}>Cine suntem</p>
                <h2 className={heading}>Două țări, o singură familie</h2>

                {/* Drumul uleiului: linia se umple, picătura merge pe ea, kilometrii numără (components/oil-route.tsx) */}
                <OilRoute className="mt-10" />

                <div className="mt-10 grid gap-4 md:grid-cols-2">
                    <Reveal as="article" className="rounded-2xl border bg-white p-6 sm:p-8">
                        <GreekFlag className="h-6 w-9" />
                        <h3 className="mt-4 font-serif text-2xl font-semibold text-neutral-900">Toader, în livadă</h3>
                        <p className="mt-2 leading-relaxed text-neutral-700">
                            Are grijă de măslini tot anul, de la tăierea pomilor până la cules. Face uleiul așa cum a
                            învățat în aproape trei decenii de muncă.
                        </p>
                    </Reveal>
                    <Reveal as="article" className="rounded-2xl border bg-white p-6 sm:p-8">
                        <RomanianFlag className="h-6 w-9" />
                        <h3 className="mt-4 font-serif text-2xl font-semibold text-neutral-900">Marios, la Galați</h3>
                        <p className="mt-2 leading-relaxed text-neutral-700">
                            M-am născut și am crescut în Grecia, printre măslini. Acum sunt la Galați, unde conduc magazinul
                            nostru și am grijă ca fiecare sticlă să ajungă la tine așa cum a plecat din livadă.
                        </p>
                    </Reveal>
                </div>
            </section>

            {/* 5. Cum se face uleiul: patru pași, fiecare cu poza lui */}
            <section className="border-y bg-white">
                <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
                    <p className={eyebrow}>De la livadă la sticlă</p>
                    <h2 className={heading}>Nimic altceva decât măsline</h2>
                    <ol className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
                        {STEPS.map((step, index) => (
                            <Reveal as="li" key={step.title} className="group">
                                <div className="relative aspect-square overflow-hidden rounded-2xl">
                                    <Image
                                        src={step.image}
                                        alt={step.alt}
                                        fill
                                        sizes="(min-width: 1024px) 25vw, 50vw"
                                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                    />
                                </div>
                                <h3 className="mt-4 text-sm font-semibold text-neutral-900 sm:text-base">
                                    <span className="mr-1.5 text-olive">{index + 1}.</span>
                                    {step.title}
                                </h3>
                                <p className="mt-1 text-sm leading-relaxed text-neutral-600 sm:text-base">{step.text}</p>
                            </Reveal>
                        ))}
                    </ol>
                    <p className="mt-10 text-sm text-neutral-600">
                        Certificată bio din 2015, sub controlul DIO <span className="whitespace-nowrap">(GR-BIO-01)</span>.{" "}
                        <Link href={ORGANIC_CERTIFICATE_PATH} className="font-medium text-olive underline underline-offset-2">
                            Vezi certificatul
                        </Link>
                    </p>
                </div>
            </section>

            {/* 6. Câteva imagini din livadă */}
            <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
                <p className={eyebrow}>Galerie</p>
                <h2 className={heading}>Din livada noastră</h2>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                    {GALLERY.map((photo) => (
                        <Reveal variant="curtain" key={photo.image} className="relative aspect-square overflow-hidden rounded-2xl">
                            <Image
                                src={photo.image}
                                alt={photo.alt}
                                fill
                                sizes="(min-width: 768px) 33vw, 50vw"
                                className="object-cover transition duration-700 ease-out hover:scale-105"
                            />
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* 7. Invitația */}
            <section className="bg-olive text-white">
                <Reveal className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-8 sm:py-20">
                    <h2 className="font-serif text-3xl leading-tight font-semibold text-balance sm:text-4xl">
                        De la livada noastră, direct pe masa ta
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
                        Livrăm în toată țara. Iar dacă ești în Galați, te așteptăm la magazin.
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
                            Vino la magazin
                        </Link>
                    </div>
                </Reveal>
            </section>
        </main>
    );
}
