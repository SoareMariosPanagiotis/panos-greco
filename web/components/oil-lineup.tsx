import { Suspense, type CSSProperties } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { OIL_PATH, OilPrice } from "@/components/oil-prices";
import bottle250 from "@/public/banner/sticla-250ml.webp";
import bottle500 from "@/public/banner/sticla-500ml.webp";
import bottle1 from "@/public/banner/sticla-1l.webp";
import bottle3 from "@/public/banner/sticla-3l.webp";
import bottle5 from "@/public/banner/sticla-5l.webp";

// Cele cinci ambalaje, în rând, „așezate pe masă”. Fiecare e un link spre pagina uleiului, cu mărimea
// lui deja aleasă (?marime=1-l).
//
// Pozele sunt decupate (fundal transparent) și au aceeași scară: 1 l = 900 px înălțime, restul pe măsura
// lor reală în centimetri. Deci lățimea fiecăreia în rând o calculăm din lățimea pozei, nu o scriem de mână.
//
// Umbrele nu sunt în poze, le face CSS-ul (globals.css, „.oil-bottle-…”):
// - umbra de contact: o elipsă estompată chiar sub sticlă;
// - umbra aruncată: aceeași poză, făcută neagră și estompată, turtită și înclinată spre dreapta-spate,
//   ca lumina să pară că vine din stânga, la fel ca în pozele produselor.

const BOTTLES: { size: string; label: string; image: StaticImageData }[] = [
    { size: "250-ml", label: "250 ml", image: bottle250 },
    { size: "500-ml", label: "500 ml", image: bottle500 },
    { size: "1-l", label: "1 l", image: bottle1 },
    { size: "3-l", label: "3 l", image: bottle3 },
    { size: "5-l", label: "5 l", image: bottle5 },
];

const GAP = 52; // spațiul dintre ambalaje, în pixelii pozelor (5,8% din înălțimea sticlei de 1 l)
const TOTAL = BOTTLES.reduce((sum, bottle) => sum + bottle.image.width, 0) + GAP * (BOTTLES.length - 1);

export function OilLineup({ className = "" }: { className?: string }) {
    return (
        <div className={`oil-lineup ${className}`}>
            {BOTTLES.map((bottle, index) => {
                const share = (bottle.image.width / TOTAL) * 100; // procente din lățimea rândului
                // Cât de lată apare poza pe ecran, ca browserul să descarce mărimea potrivită
                const sizes = `(min-width: 1536px) ${Math.ceil(share * 7.2)}px, (min-width: 1024px) ${Math.ceil(share * 6.4)}px, ${Math.ceil(share * 0.92)}vw`;
                return (
                    <Link
                        key={bottle.size}
                        href={`${OIL_PATH}?marime=${bottle.size}`}
                        className="oil-bottle"
                        style={{ width: `${share}%`, "--i": index } as CSSProperties}
                    >
                        <span className="oil-bottle-ambient" aria-hidden="true" />
                        <Image src={bottle.image} alt="" sizes={sizes} loading="eager" className="oil-bottle-cast" aria-hidden="true" />
                        <span className="oil-bottle-contact" aria-hidden="true" />
                        <Image src={bottle.image} alt="" sizes={sizes} loading="eager" className="oil-bottle-image" />
                        <span className="oil-bottle-label">
                            <span className="sr-only">Ulei de măsline extravirgin bio, </span>
                            {bottle.label}
                            {/* Prețul vine din baza de date; până sosește, sub sticlă e doar mărimea */}
                            <Suspense fallback={null}>
                                <OilPrice size={bottle.size} className="oil-bottle-price" />
                            </Suspense>
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
