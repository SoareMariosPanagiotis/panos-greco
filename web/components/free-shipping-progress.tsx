import { formatPrice } from "@/lib/catalog";

type Props = { subtotal: number; over: number; method: string };

// Bara „Mai adaugă X și livrarea devine gratuită”, folosită în coș și în coșul din lateral
export function FreeShippingProgress({ subtotal, over, method }: Props) {
    const missing = over - subtotal;
    const percent = Math.min(100, Math.round((subtotal / over) * 100));

    return (
        <div className="rounded-lg bg-olive-light p-3 text-sm text-olive">
            <p>
                {missing > 0 ? (
                    <>
                        Mai adaugă produse de <strong>{formatPrice(String(missing))}</strong> și „{method}”
                        devine gratuită.
                    </>
                ) : (
                    <strong>„{method}” este gratuită pentru comanda ta!</strong>
                )}
            </p>
            <div
                role="progressbar"
                aria-label="Progres spre livrarea gratuită"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="mt-2 h-2 overflow-hidden rounded-full bg-white"
            >
                <div
                    className="h-full rounded-full bg-olive transition-all"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}