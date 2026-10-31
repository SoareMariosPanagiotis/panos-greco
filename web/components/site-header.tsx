import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { AccountLink, AccountLinkFallback } from "@/components/account-link";
import { CartLink } from "@/components/cart-link";

const links = [
    { href: "/", label: "Produse" },
    { href: "/despre", label: "Despre noi" },
    { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
    return (
        // relative z-10: logo-ul care iese sub bară rămâne deasupra paginii
        <header className="relative z-10 bg-olive text-white">
            {/* Bara e mai lată decât conținutul paginii (max-w-6xl = 1152 px), dar are cel mult
                1536 px (96rem): logo-ul stă spre stânga, meniul spre dreapta, iar pe ecranele
                foarte late nu se depărtează prea mult unul de altul */}
            <div className="mx-auto flex h-22 max-w-[96rem] items-center justify-between px-8">
                {/* Logo-ul are formă de etichetă: atârnă din marginea de sus și iese puțin sub bară.
                    width/height = mărimea reală a fișierelor SVG; pe ecran mărimea o dau clasele h-… w-auto */}
                <Link href="/" className="flex h-full items-start gap-4">
                    <Image
                        src="/logo.svg"
                        alt="Panos Greco"
                        width={496}
                        height={412}
                        loading="eager"
                        className="h-30 w-auto shrink-0"
                    />
                    {/* Numele, cu exact aceleași litere ca în logo, dar albe.
                        Pe telefon îl ascundem, ca să încapă meniul. */}
                    <Image
                        src="/logo-text-white.svg"
                        alt=""
                        width={321}
                        height={66}
                        loading="eager"
                        className="hidden h-10 w-auto self-center sm:block"
                    />
                </Link>
                <nav className="flex items-center gap-6 text-sm font-medium">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="opacity-90 hover:underline hover:opacity-100"
                        >
                            {link.label}
                        </Link>
                    ))}
                    {/* Doar bucata asta citește cookie-ul, restul meniului rămâne static */}
                    <Suspense fallback={<AccountLinkFallback />}>
                        <AccountLink />
                    </Suspense>
                    <CartLink />
                </nav>
            </div>
        </header>
    );
}
