import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { AccountLink, AccountLinkFallback } from "@/components/account-link";
import { CartLink } from "@/components/cart-link";
import { NAV_LINKS } from "@/lib/nav";

// Mobile-first: clasele fără prefix sunt pentru telefon, iar sm: (640 px) și md: (768 px)
// le schimbă pe ecranele mai late. Pe telefon, meniul, contul și coșul stau în bara de jos
// (MobileTabBar); aici rămâne doar logo-ul.
export function SiteHeader() {
    return (
        // relative z-10: logo-ul care iese sub bară (pe calculator) rămâne deasupra paginii
        <header className="relative z-10 bg-olive text-white print:hidden">
            {/* Bara e mai lată decât conținutul paginii (max-w-6xl = 1152 px), dar are cel mult
                1536 px (96rem): logo-ul stă spre stânga, meniul spre dreapta, iar pe ecranele
                foarte late nu se depărtează prea mult unul de altul.
                Pe telefon: bară mai joasă (h-16), margini mai mici (px-4), iar logo-ul și numele stau
                împreună pe mijloc (justify-center); de la md, logo-ul trece în stânga și meniul în dreapta. */}
            <div className="mx-auto flex h-16 max-w-[96rem] items-center justify-center gap-3 px-4 sm:px-8 md:h-22 md:justify-between">
                {/* Pe telefon: logo-ul mic și numele, unul lângă altul, în interiorul barei.
                    Pe calculator: logo-ul are formă de etichetă, atârnă din marginea de sus și iese puțin sub bară.
                    width/height = mărimea reală a fișierelor SVG; pe ecran mărimea o dau clasele h-… w-auto */}
                <Link href="/" className="flex h-full items-center gap-2 md:items-start md:gap-4">
                    <Image
                        src="/logo.svg"
                        alt="Panos Greco"
                        width={496}
                        height={412}
                        loading="eager"
                        className="h-12 w-auto shrink-0 md:h-30"
                    />
                    {/* Numele, cu exact aceleași litere ca în logo, dar albe */}
                    <Image
                        src="/logo-text-white.svg"
                        alt=""
                        width={321}
                        height={66}
                        loading="eager"
                        className="h-7 w-auto md:h-10 md:self-center"
                    />
                </Link>
                {/* De la md în sus; pe telefon aceleași lucruri sunt în bara de jos.
                    CartLink rămâne pe pagină și pe telefon (doar ascuns), pentru că el desenează sertarul coșului. */}
                <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
                    {NAV_LINKS.map((link) => (
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
