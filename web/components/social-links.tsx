import type { ShopInfo } from "@/lib/shop-info";

// Butoanele spre Facebook și Instagram. Apar doar pentru linkurile completate în admin („Datele firmei”).
// Pictogramele sunt desenate aici, în SVG: biblioteca noastră de pictograme (lucide) nu mai are sigle de branduri.
// target="_blank": se deschid într-un tab nou, ca clientul să nu plece din magazin.
// rel="noopener noreferrer": pagina deschisă nu poate controla tabul nostru și nu află de unde vine.

function FacebookIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
            <path d="M13.5 21v-7.5h2.6l.4-3.1h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.3H8v3.1h2.5V21h3z" />
        </svg>
    );
}

function InstagramIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
        </svg>
    );
}

export function SocialLinks({ shop, className = "" }: { shop: ShopInfo; className?: string }) {
    const links: { href: string; label: string; Icon: typeof FacebookIcon }[] = [];
    if (shop.facebookUrl) links.push({ href: shop.facebookUrl, label: "Panos Greco pe Facebook", Icon: FacebookIcon });
    if (shop.instagramUrl) links.push({ href: shop.instagramUrl, label: "Panos Greco pe Instagram", Icon: InstagramIcon });
    if (links.length === 0) return null;

    return (
        <ul className={`flex gap-2 ${className}`}>
            {links.map(({ href, label, Icon }) => (
                <li key={href}>
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        title={label}
                        className="flex size-10 items-center justify-center rounded-full bg-current/10 transition hover:bg-current/20"
                    >
                        <Icon className="size-5" />
                    </a>
                </li>
            ))}
        </ul>
    );
}
