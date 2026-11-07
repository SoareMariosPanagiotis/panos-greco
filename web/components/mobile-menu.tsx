"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tabItemClass, type NavLink } from "@/lib/nav";

// Butonul „Meniu” din bara de jos de pe telefon: deschide un panou care alunecă din stânga
// (la fel ca sertarul coșului, care vine din dreapta).
export function MobileMenu({ links }: { links: NavLink[] }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} aria-expanded={open} className={tabItemClass}>
                <Menu className="size-5" />
                <span>Meniu</span>
            </button>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="left" className="w-72 bg-white">
                    <SheetHeader>
                        <SheetTitle className="text-lg text-olive">Meniu</SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col px-2">
                        {links.map((link) => (
                            // La click închidem panoul: pagina se schimbă, panoul ar rămâne deschis
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="rounded-lg px-3 py-3 text-base font-medium text-neutral-800 hover:bg-olive-light hover:text-olive"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </SheetContent>
            </Sheet>
        </>
    );
}
