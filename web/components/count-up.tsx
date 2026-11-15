"use client";

import { useEffect, useRef } from "react";
import { isOnScreen, motionAllowed, whenVisible } from "@/components/reveal";

// Un număr care „numără” până la valoarea lui când ajungi la el (de ex. 1.500 km).
// Serverul scrie direct valoarea finală, deci fără JavaScript vezi numărul corect.
// Dacă stă într-un <Reveal>, pornește odată cu el, ca numărul și desenul să meargă împreună.

// 1500 → „1.500”. O scriem de mână, nu cu Intl.NumberFormat: serverul și browserul pot grupa
// cifrele diferit, iar atunci React s-ar plânge că pagina de pe server nu seamănă cu cea din browser.
function format(value: number) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Pornește încet, merge repede, se oprește încet: la fel ca picătura de pe drum
function easeInOut(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CountUp({ value, duration = 2400, className }: { value: number; duration?: number; className?: string }) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const element = ref.current;
        const text = element?.firstChild;
        if (!element || !text || !motionAllowed()) return;

        const trigger = element.closest("[data-reveal]") ?? element;
        if (isOnScreen(trigger)) return;

        let frame = 0;
        const stop = whenVisible(trigger, () => {
            const start = performance.now();
            const tick = (now: number) => {
                const progress = Math.min((now - start) / duration, 1);
                text.nodeValue = format(Math.round(easeInOut(progress) * value));
                if (progress < 1) frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        });
        return () => {
            stop();
            cancelAnimationFrame(frame);
            text.nodeValue = format(value);
        };
    }, [value, duration]);

    return (
        <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
            {format(value)}
        </span>
    );
}
