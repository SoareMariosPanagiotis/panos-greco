import { Suspense } from "react";
import Link from "next/link";
import { House } from "lucide-react";
import { AccountTab, AccountTabFallback } from "@/components/account-link";
import { CartTab } from "@/components/cart-link";
import { MobileMenu } from "@/components/mobile-menu";
import { NAV_LINKS, tabItemClass } from "@/lib/nav";

// Bara de jos, doar pe telefon (md:hidden), ca la aplicațiile de cumpărături:
// pe un telefon mare, degetul mare ajunge ușor jos și greu sus.
// fixed bottom-0: stă lipită de marginea de jos, chiar dacă derulezi pagina.
// z-40: deasupra paginii, dar sub panourile (coș, meniu), care au z-50.
export function MobileTabBar() {
    return (
        <nav
            aria-label="Navigare rapidă"
            className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-white/95 backdrop-blur md:hidden print:hidden"
        >
            <Link href="/" className={tabItemClass}>
                <House className="size-5" />
                <span>Acasă</span>
            </Link>
            <MobileMenu links={NAV_LINKS} />
            <Suspense fallback={<AccountTabFallback />}>
                <AccountTab />
            </Suspense>
            <CartTab />
        </nav>
    );
}
