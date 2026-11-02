"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Câmp de parolă cu „ochi”: clientul poate vedea ce a scris, ca să nu greșească parola.
// Când pleacă formularul, parola se ascunde la loc: nu rămâne la vedere pe ecran, iar
// managerul de parole al browserului o recunoaște ca parolă și se oferă să o salveze.
export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
    const [visible, setVisible] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const form = input.current?.form;
        if (!form) return;
        const hide = () => {
            // Direct în pagină, pe loc: browserul se uită la câmp chiar în momentul trimiterii
            if (input.current) input.current.type = "password";
            setVisible(false);
        };
        form.addEventListener("submit", hide);
        return () => form.removeEventListener("submit", hide);
    }, []);

    return (
        <div className="relative">
            <Input
                {...props}
                ref={input}
                type={visible ? "text" : "password"}
                // pr-9: loc pentru ochi; ::-ms-reveal: Edge are ochiul lui, îl ascundem ca să nu fie doi
                className={cn("pr-9 [&::-ms-reveal]:hidden", className)}
            />
            <button
                type="button"
                onClick={() => setVisible((shown) => !shown)}
                // Pe telefon, atingerea nu mută cursorul din câmp, deci tastatura rămâne deschisă
                onMouseDown={(event) => event.preventDefault()}
                aria-label="Arată parola"
                aria-pressed={visible}
                aria-controls={props.id}
                title={visible ? "Ascunde parola" : "Arată parola"}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-neutral-500 outline-none hover:text-neutral-900 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
                {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
        </div>
    );
}
