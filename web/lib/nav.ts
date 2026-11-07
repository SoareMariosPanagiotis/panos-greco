// Linkurile meniului principal, folosite și sus (pe calculator) și în bara de jos (pe telefon)
export const NAV_LINKS = [
    { href: "/", label: "Produse" },
    { href: "/despre", label: "Despre noi" },
    { href: "/contact", label: "Contact" },
];

export type NavLink = (typeof NAV_LINKS)[number];

// Aspectul unui buton din bara de jos: iconița deasupra, textul mic dedesubt.
// flex-1: cele 4 butoane împart lățimea în mod egal, oricât de lat e telefonul.
export const tabItemClass =
    "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium text-neutral-600 hover:text-olive";
