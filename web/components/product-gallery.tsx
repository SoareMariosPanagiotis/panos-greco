"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { imageSrc, type ProductImage } from "@/lib/product-images";

// Galeria de pe pagina produsului, ca la magazinele mari:
//  - telefon: glisezi cu degetul de la o poză la alta, iar punctele de dedesubt arată unde ești;
//  - calculator: săgeți pe poză și miniaturi dedesubt;
//  - oriunde: apeși pe poză și se deschide pe tot ecranul (zoom), cu aceleași gesturi.

function prefersMotion() {
    return typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Un rând de poze care se derulează lateral și se oprește fix pe câte o poză (CSS „scroll snap”).
// Ce poză se vede aflăm din poziția de derulare, așa că degetul, săgețile și miniaturile
// țin aceeași evidență, fără să se contrazică.
function useSnapRow(count: number) {
    const ref = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);

    function onScroll() {
        const row = ref.current;
        if (!row || row.clientWidth === 0) return;
        setIndex(Math.min(count - 1, Math.max(0, Math.round(row.scrollLeft / row.clientWidth))));
    }

    function go(target: number) {
        const row = ref.current;
        if (!row) return;
        const next = Math.min(count - 1, Math.max(0, target));
        row.scrollTo({ left: next * row.clientWidth, behavior: prefersMotion() ? "smooth" : "instant" });
    }

    return { ref, index, onScroll, go };
}

function Arrow({ side, onClick, disabled, className = "" }: {
    side: "left" | "right";
    onClick: () => void;
    disabled: boolean;
    className?: string;
}) {
    const Icon = side === "left" ? ChevronLeft : ChevronRight;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={side === "left" ? "Poza anterioară" : "Poza următoare"}
            className={`absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full shadow transition disabled:pointer-events-none disabled:opacity-0 md:flex ${
                side === "left" ? "left-3" : "right-3"
            } ${className}`}
        >
            <Icon className="size-5" />
        </button>
    );
}

// Rândul de poze pe tot ecranul. Se montează abia la deschidere, deci pornește de la poza apăsată.
function ZoomView({ images, productName, startAt }: { images: ProductImage[]; productName: string; startAt: number }) {
    // Separat, nu ca obiect: regula React „refs” nu vrea să citim în randare un obiect care conține un ref
    const { ref, index, onScroll, go } = useSnapRow(images.length);

    // Înainte să se vadă ecranul: sărim direct la poza apăsată, fără animație
    useLayoutEffect(() => {
        const el = ref.current;
        if (el) el.scrollLeft = startAt * el.clientWidth;
    }, [ref, startAt]);

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowLeft") go(index - 1);
        if (event.key === "ArrowRight") go(index + 1);
    }

    return (
        <div className="relative h-full" onKeyDown={onKeyDown}>
            <div
                ref={ref}
                onScroll={onScroll}
                className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {images.map((image, i) => (
                    <div key={image.id} className="relative h-full w-full shrink-0 snap-center">
                        <Image
                            src={imageSrc(image.id)}
                            alt={image.alt ?? productName}
                            fill
                            sizes="100vw"
                            loading={i === startAt ? "eager" : undefined}
                            className="object-contain p-3 sm:p-12"
                        />
                    </div>
                ))}
            </div>
            {images.length > 1 && (
                <>
                    <Arrow
                        side="left"
                        onClick={() => go(index - 1)}
                        disabled={index === 0}
                        className="bg-white/15 text-white hover:bg-white/25"
                    />
                    <Arrow
                        side="right"
                        onClick={() => go(index + 1)}
                        disabled={index === images.length - 1}
                        className="bg-white/15 text-white hover:bg-white/25"
                    />
                    <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm text-white/80" aria-live="polite">
                        {index + 1} / {images.length}
                    </p>
                </>
            )}
            <Dialog.Close
                aria-label="Închide"
                className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            >
                <X className="size-6" />
            </Dialog.Close>
        </div>
    );
}

type Props = { images: ProductImage[]; productName: string };

export function ProductGallery({ images, productName }: Props) {
    // Separat, nu ca obiect: regula React „refs” nu vrea să citim în randare un obiect care conține un ref
    const { ref, index, onScroll, go } = useSnapRow(images.length);
    const [zoomAt, setZoomAt] = useState<number | null>(null);

    // Fără poze: prima literă din nume, ca până acum
    if (images.length === 0) {
        return (
            <div className="flex aspect-square items-center justify-center rounded-xl border bg-olive-light text-8xl font-bold text-olive/30">
                {productName[0]}
            </div>
        );
    }

    const many = images.length > 1;

    return (
        <div>
            <div className="relative">
                <div
                    ref={ref}
                    onScroll={onScroll}
                    aria-roledescription="carusel"
                    aria-label={`Pozele pentru ${productName}`}
                    className="flex aspect-square snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-xl border bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {images.map((image, i) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => setZoomAt(i)}
                            aria-label={`Mărește poza ${i + 1} din ${images.length}`}
                            className="relative h-full w-full shrink-0 cursor-zoom-in snap-center"
                        >
                            {/* object-contain: arătăm toată poza, fără să tăiem din ea */}
                            <Image
                                src={imageSrc(image.id)}
                                alt={image.alt ?? productName}
                                fill
                                loading={i === 0 ? "eager" : undefined}
                                sizes="(min-width: 1152px) 560px, (min-width: 768px) 50vw, 100vw"
                                className="object-contain"
                            />
                        </button>
                    ))}
                </div>
                {many && (
                    <>
                        <Arrow
                            side="left"
                            onClick={() => go(index - 1)}
                            disabled={index === 0}
                            className="bg-white/90 text-neutral-800 hover:bg-white"
                        />
                        <Arrow
                            side="right"
                            onClick={() => go(index + 1)}
                            disabled={index === images.length - 1}
                            className="bg-white/90 text-neutral-800 hover:bg-white"
                        />
                    </>
                )}
                {/* Semnul că poza se poate mări */}
                <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-white/85 p-2 text-neutral-700 shadow-sm"
                >
                    <Expand className="size-4" />
                </span>
            </div>

            {many && (
                <>
                    {/* Telefon: punctele (cel lung e poza de acum) */}
                    <div className="mt-3 flex justify-center gap-1.5 md:hidden" aria-hidden>
                        {images.map((image, i) => (
                            <span
                                key={image.id}
                                className={`h-1.5 rounded-full transition-all ${
                                    i === index ? "w-5 bg-olive" : "w-1.5 bg-neutral-300"
                                }`}
                            />
                        ))}
                    </div>
                    {/* Calculator: miniaturile */}
                    <div className="mt-3 hidden flex-wrap gap-2 md:flex">
                        {images.map((image, i) => (
                            <button
                                key={image.id}
                                type="button"
                                onClick={() => go(i)}
                                aria-label={`Poza ${i + 1} din ${images.length}`}
                                aria-current={i === index ? "true" : undefined}
                                className={`relative size-20 overflow-hidden rounded-lg border-2 bg-white transition ${
                                    i === index ? "border-olive" : "border-transparent opacity-70 hover:opacity-100"
                                }`}
                            >
                                {/* Prima miniatură se încarcă la fel ca prima poză mare (eager): au aceeași adresă
                                    de rezervă (src), iar altfel Next.js ar crede, greșit, că poza mare e „lazy” */}
                                <Image
                                    src={imageSrc(image.id)}
                                    alt=""
                                    fill
                                    sizes="80px"
                                    loading={i === 0 ? "eager" : undefined}
                                    className="object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Pe tot ecranul. Dialog (Base UI) se ocupă de Escape, de focus și de blocarea derulării paginii. */}
            <Dialog.Root open={zoomAt !== null} onOpenChange={(open) => !open && setZoomAt(null)}>
                <Dialog.Portal>
                    <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/90" />
                    <Dialog.Popup className="fixed inset-0 z-50 outline-none">
                        <Dialog.Title className="sr-only">{productName}</Dialog.Title>
                        {zoomAt !== null && <ZoomView images={images} productName={productName} startAt={zoomAt} />}
                    </Dialog.Popup>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
