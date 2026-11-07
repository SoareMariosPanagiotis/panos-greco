import Link from "next/link";
import { UserRound } from "lucide-react";
import { getSession } from "@/lib/auth";
import { tabItemClass } from "@/lib/nav";

type AccountTarget = { href: string; label: string };

// O singură regulă pentru „unde duce contul”, folosită și sus, și în bara de jos
async function getAccountTarget(): Promise<AccountTarget> {
    const session = await getSession();

    // Neconectat: „Contul meu” duce la pagina de intrare
    if (!session) return { href: "/cont/intra", label: "Contul meu" };

    // Adminul vede direct drumul spre administrare
    const { user } = session;
    if (user.role !== "client") return { href: "/admin", label: "Administrare" };

    return { href: "/cont", label: user.firstName ? `Salut, ${user.firstName}` : "Contul meu" };
}

function AccountLinkView({ href, label }: AccountTarget) {
    return (
        <Link href={href} className="flex items-center gap-2 opacity-90 hover:opacity-100">
            <UserRound className="size-5" />
            <span className="max-w-32 truncate">{label}</span>
        </Link>
    );
}

// Se vede o clipă, cât timp serverul află cine ești
export function AccountLinkFallback() {
    return <AccountLinkView href="/cont" label="Contul meu" />;
}

export async function AccountLink() {
    return <AccountLinkView {...await getAccountTarget()} />;
}

// Varianta din bara de jos de pe telefon: scrie scurt „Cont”, numele complet e în aria-label
function AccountTabView({ href, label }: AccountTarget) {
    return (
        <Link href={href} aria-label={label} className={tabItemClass}>
            <UserRound className="size-5" />
            <span>Cont</span>
        </Link>
    );
}

export function AccountTabFallback() {
    return <AccountTabView href="/cont" label="Contul meu" />;
}

export async function AccountTab() {
    return <AccountTabView {...await getAccountTarget()} />;
}
