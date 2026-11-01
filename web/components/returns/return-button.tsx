import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { RETURN_BUTTON_LABEL, RETURN_FORM_PATH } from "@/lib/withdrawals";

// Butonul care deschide formularul de retur (funcția de retragere cerută de OUG 18/2026).
// Fără comandă duce la pagina unde clientul își alege comanda; cu comandă, direct la ea.
const STYLES = {
    solid: "h-auto bg-olive px-5 py-3 text-base text-white hover:bg-olive/90",
    outline: "border-olive text-olive hover:bg-olive hover:text-white",
};

type ReturnButtonProps = {
    orderId?: string;
    label?: string;
    look?: keyof typeof STYLES;
    className?: string;
};

export function ReturnButton({ orderId, label = RETURN_BUTTON_LABEL, look = "outline", className = "" }: ReturnButtonProps) {
    const href = orderId ? `${RETURN_FORM_PATH}/${orderId}` : RETURN_FORM_PATH;
    return (
        <Link href={href} className={buttonVariants({ variant: "outline", className: `${STYLES[look]} ${className}` })}>
            {label}
        </Link>
    );
}
