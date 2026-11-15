import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { GreekFlag } from "@/components/greek-flag";
import { HeroParallax } from "@/components/hero-parallax";
import { OilLineup } from "@/components/oil-lineup";
import { OIL_PATH } from "@/components/oil-prices";
import { Words } from "@/components/words";
// Pozele le importăm ca pe un fișier de cod, nu le scriem ca text ("/banner/…"). Așa Next.js le pune
// în adresă o amprentă a conținutului (scena-lata.a1b2c3.jpg): când schimbi poza, se schimbă adresa,
// iar browserul și serverul nu mai pot arăta varianta veche din memorie.
import leavesFar from "@/public/banner/frunze-departe.webp";
import leavesNear from "@/public/banner/frunze-aproape.webp";
import sceneNarrow from "@/public/banner/scena-ingusta.jpg";
import sceneWide from "@/public/banner/scena-lata.jpg";

// Bannerul mare din pagina principală, „vitrina”: aceeași scenă ca în pozele produselor (perete cald,
// masă de piatră, umbră de măslin), dar construită din straturi, ca să se poată mișca:
//
//   1. fundalul: peretele și masa, fără produse (o poză lată pe calculator, una îngustă pe telefon);
//      are toată înălțimea bannerului și stă pe mijloc, deci arată la fel pe 1280 px și pe 2560 px;
//   2. umbra ramurilor de măslin pe perete: două straturi transparente care se leagănă încet, ca în vânt;
//   3. cele cinci ambalaje, fiecare separat (OilLineup): se așază pe masă unul după altul; cu mouse-ul,
//      sticla se ridică, iar un clic deschide pagina uleiului cu mărimea ei deja aleasă;
//   4. textul, deasupra tuturor. Nu e „lipit” în poză: e HTML, deci îl citește Google și îl schimbi oricând.
//
// Straturile 2 și 3 se mișcă puțin și după mouse (HeroParallax), fiecare cât de „departe” e.
// Toate mișcările sunt în globals.css, la „Bannerul de pe prima pagină”.

export function HomeHero() {
    // Fundalul e în CSS (background-image), ca să poată schimba poza după lățimea ecranului (media query).
    // Îi dăm adresele pozelor prin două variabile CSS.
    const scene = {
        "--scene-narrow": `url(${sceneNarrow.src})`,
        "--scene-wide": `url(${sceneWide.src})`,
    } as CSSProperties;

    return (
        <HeroParallax
            className="scene-bg relative isolate h-[660px] overflow-hidden sm:h-[700px] md:h-[780px] lg:h-[560px] xl:h-[620px] 2xl:h-[680px]"
            style={scene}
        >
            {/* Umbra frunzelor: doar pe perete (partea de sus, până la masă), întunecând ce e dedesubt (multiply) */}
            <div
                aria-hidden="true"
                className="leaves-wall pointer-events-none absolute inset-x-0 top-0 h-[72%] overflow-hidden mix-blend-multiply lg:h-[70%]"
            >
                <div className="relative mx-auto h-full max-w-6xl">
                    <div className="leaves-depth absolute -top-[4%] -right-[42%] aspect-[16/11] w-[125%] sm:-right-[24%] sm:w-[92%] md:w-[80%] lg:-top-[14%] lg:-right-[230px] lg:w-[860px] xl:w-[920px] 2xl:-right-[300px] 2xl:w-[1000px]">
                        <Image src={leavesFar} alt="" fill sizes="(min-width: 1024px) 1000px, 100vw" className="leaves-far" />
                        <Image src={leavesNear} alt="" fill sizes="(min-width: 1024px) 1000px, 100vw" className="leaves-near" />
                    </div>
                </div>
            </div>

            <div className="relative mx-auto h-full max-w-6xl px-4 sm:px-8">
                <div className="relative z-10 max-w-md pt-7 text-neutral-900 sm:pt-10 md:max-w-2xl lg:absolute lg:top-[45%] lg:max-w-[25rem] lg:-translate-y-1/2 lg:pt-0 xl:max-w-md">
                    <p className="enter flex items-center gap-2 text-sm font-medium text-olive">
                        <GreekFlag className="h-3 w-[18px] shrink-0 sm:h-3.5 sm:w-[21px]" />
                        Din livada familiei din Messinia, Grecia
                    </p>
                    <h1 className="mt-3 font-serif text-[1.75rem] leading-[1.1] font-semibold text-balance min-[400px]:text-[2rem] sm:text-5xl lg:text-[2.6rem] xl:text-5xl">
                        <Words text="Ulei de măsline extravirgin bio, presat la rece" delay={150} />
                    </h1>
                    {/* Pe telefoanele foarte înguste (sub 360 px) nu mai are loc deasupra sticlelor */}
                    <p className="enter enter-1 mt-3 text-[0.95rem] leading-relaxed text-neutral-700 max-[359px]:hidden sm:mt-4 sm:text-lg lg:text-base xl:text-lg">
                        Nefiltrat, din măslinele livezii noastre de lângă Kalamata. Direct de la producător.
                    </p>
                    <div className="enter enter-2 mt-4 flex flex-wrap gap-3 sm:mt-6">
                        <Link
                            href={OIL_PATH}
                            className="btn-sheen rounded-full bg-olive px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-300 min-[400px]:px-6 hover:-translate-y-0.5 hover:shadow-lg sm:text-base"
                        >
                            Descoperă uleiul
                        </Link>
                        <Link
                            href="#produse"
                            className="rounded-full border border-olive/40 bg-white/60 px-5 py-3 text-sm font-semibold text-olive backdrop-blur transition duration-300 min-[400px]:px-6 hover:-translate-y-0.5 hover:bg-white sm:text-base"
                        >
                            Toate produsele
                        </Link>
                    </div>
                </div>

                {/* Sticlele stau pe masă: baza lor e la 90–93% din înălțime, sub linia unde se termină peretele (70–72%) */}
                <OilLineup className="lineup-depth absolute inset-x-0 bottom-[7%] mx-auto w-[min(92%,30rem)] md:w-[34rem] lg:inset-x-auto lg:right-8 lg:bottom-[10%] lg:w-[560px] xl:w-[640px] 2xl:-right-6 2xl:w-[720px]" />
            </div>
        </HeroParallax>
    );
}
