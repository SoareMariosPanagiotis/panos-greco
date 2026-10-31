import Link from "next/link";
import { UserRound } from "lucide-react";
import { firstName, getSession } from "@/lib/auth";

function AccountLinkView({ href, label }: { href: string; label: string }) {
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
    const session = await getSession();

    // Neconectat: „Contul meu” duce la pagina de intrare
    if (!session) {
        return <AccountLinkView href="/cont/intra" label="Contul meu" />;
    }

    // Adminul vede direct drumul spre administrare
    const { user } = session;
    if (user.role !== "client") {
        return <AccountLinkView href="/admin" label="Administrare" />;
    }

    const name = firstName(user);
    return <AccountLinkView href="/cont" label={name ? `Salut, ${name}` : "Contul meu"} />;
}