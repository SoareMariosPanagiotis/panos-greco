"use client";

import { useEffect, useRef, type ReactNode, type Ref } from "react";

// Mișcarea „la scroll”: un element stă ascuns până ajungi la el, apoi intră o singură dată.
//
// Cum merge, pe scurt:
// 1. Serverul trimite pagina completă, cu totul vizibil. Fără JavaScript (sau pentru Google) nu lipsește nimic.
// 2. După ce pagina devine interactivă, fiecare <Reveal> se uită unde e: dacă e deja pe ecran, nu se atinge
//    de nimic (altfel ai vedea elementul dispărând și apărând iar). Dacă e mai jos, se ascunde.
// 3. Un singur IntersectionObserver (un „paznic” al browserului, mult mai ieftin decât să ascultăm scroll-ul)
//    ne anunță când elementul intră pe ecran. Atunci îi punem data-state="in", iar animația e în globals.css.
// 4. Elementele care intră în același moment (un rând de produse) pornesc pe rând, la 80 ms unul de altul.
//
// Atributele le scriem direct pe element (ref), nu prin useState: nu e nevoie ca React să redeseneze ceva.

type Listener = (order: number) => void;

const listeners = new Map<Element, Set<Listener>>();
let observer: IntersectionObserver | undefined;

function getObserver() {
    observer ??= new IntersectionObserver(
        (entries) => {
            // În ordinea din pagină, ca primul din rând să pornească primul
            const targets = entries
                .filter((entry) => entry.isIntersecting)
                .map((entry) => entry.target)
                .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
            targets.forEach((target, index) => {
                const callbacks = listeners.get(target);
                listeners.delete(target);
                observer?.unobserve(target);
                callbacks?.forEach((callback) => callback(Math.min(index, 7)));
            });
        },
        // Pornește când s-a văzut o bucată din element și a trecut puțin de marginea de jos a ecranului
        { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
    );
    return observer;
}

/** Cheamă `listener` o singură dată, când `element` intră pe ecran. Întoarce funcția de renunțare. */
export function whenVisible(element: Element, listener: Listener) {
    const callbacks = listeners.get(element) ?? new Set<Listener>();
    callbacks.add(listener);
    listeners.set(element, callbacks);
    getObserver().observe(element);
    return () => {
        callbacks.delete(listener);
        if (callbacks.size === 0) {
            listeners.delete(element);
            observer?.unobserve(element);
        }
    };
}

/** Animăm doar dacă browserul știe și omul n-a cerut în sistem „mai puțină mișcare”. */
export function motionAllowed() {
    return "IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isOnScreen(element: Element) {
    const box = element.getBoundingClientRect();
    return box.top < window.innerHeight * 0.92 && box.bottom > 0;
}

type RevealProps = {
    /** Eticheta HTML: "div" dacă nu spui altceva */
    as?: "div" | "section" | "article" | "li" | "p" | "h2" | "figure";
    /**
     * rise: urcă și se limpezește (text, carduri);
     * curtain: se dezvelește de sus în jos, ca o cortină, iar poza dinăuntru se așază (rame cu poze);
     * route: nu ascunde nimic, doar pornește animația din interior (drumul uleiului).
     */
    variant?: "rise" | "curtain" | "route";
    className?: string;
    children: ReactNode;
};

export function Reveal({ as = "div", variant = "rise", className, children }: RevealProps) {
    const ref = useRef<HTMLElement>(null);
    const Tag = as as "div"; // pentru TypeScript: toate etichetele de mai sus primesc aceleași proprietăți

    useEffect(() => {
        const element = ref.current;
        if (!element || !motionAllowed() || isOnScreen(element)) return;

        element.dataset.state = "hidden";
        const stop = whenVisible(element, (order) => {
            element.style.setProperty("--reveal-delay", `${order * 80}ms`);
            element.dataset.state = "in";
        });
        return () => {
            stop();
            delete element.dataset.state;
        };
    }, []);

    return (
        <Tag ref={ref as Ref<HTMLDivElement>} data-reveal={variant} className={className}>
            {children}
        </Tag>
    );
}
