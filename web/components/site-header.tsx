import Link from "next/link";

const links = [
    { href: "/", label: "Produse" },
    { href: "/despre", label: "Despre noi" },
    { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
    return (
        <header className="bg-olive text-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
                <Link href="/web/public" className="text-2xl font-bold tracking-tight">
                    Panos Greco
                </Link>
                <nav className="flex gap-6 text-sm font-medium">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="opacity-90 hover:underline hover:opacity-100"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </header>
    );
}