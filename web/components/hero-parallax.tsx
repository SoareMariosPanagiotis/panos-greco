"use client";

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { motionAllowed } from "@/components/reveal";

// Adâncime după mouse: bannerul scrie poziția mouse-ului în două variabile CSS, --px și --py,
// fiecare între -1 (stânga/sus) și 1 (dreapta/jos). Straturile din banner se mută cu ea, fiecare cât
// îi spune CSS-ul: umbra frunzelor mai mult (e „departe”, pe perete), sticlele mai puțin.
// Așa pare că te uiți în scenă dintr-un unghi ușor diferit.
//
// - Doar cu mouse-ul (pointerType === "mouse"): pe telefon nu există „deasupra”.
// - requestAnimationFrame: scriem cel mult o dată pe cadru, oricât de des vine evenimentul.
// - Cine a cerut „mai puțină mișcare” în sistem nu primește efectul.
// - Conținutul rămâne făcut pe server: componenta doar îl învelește (children).
export function HeroParallax({
    className,
    style,
    children,
}: {
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}) {
    const ref = useRef<HTMLElement>(null);
    const frame = useRef(0);

    function handleMove(event: PointerEvent<HTMLElement>) {
        const element = ref.current;
        if (!element || event.pointerType !== "mouse" || !motionAllowed()) return;
        const box = element.getBoundingClientRect();
        const x = ((event.clientX - box.left) / box.width) * 2 - 1;
        const y = ((event.clientY - box.top) / box.height) * 2 - 1;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
            element.style.setProperty("--px", x.toFixed(3));
            element.style.setProperty("--py", y.toFixed(3));
        });
    }

    function handleLeave() {
        cancelAnimationFrame(frame.current);
        ref.current?.style.setProperty("--px", "0");
        ref.current?.style.setProperty("--py", "0");
    }

    return (
        <section ref={ref} className={className} style={style} onPointerMove={handleMove} onPointerLeave={handleLeave}>
            {children}
        </section>
    );
}
