import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTIES } from "@/lib/counties";

// Câmpurile unei adrese: județ, localitate, adresă, cod poștal.
// Aceleași în „Adresele mele” și la comandă, ca să arate și să se verifice la fel.

const selectClass =
    "h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:border-olive";

type Props = {
    // Ce scrie inițial în câmpuri (adresa salvată, sau ce a completat înainte de o eroare)
    defaults?: { county?: string; city?: string; address?: string; postalCode?: string | null };
    // Livrarea locală merge doar într-un oraș: îl blocăm în câmp
    fixedCity?: string | null;
};

export function AddressFields({ defaults, fixedCity }: Props) {
    // La un oraș fix care e și județ (ex. Galați), județul vine ales din start
    const county = defaults?.county || (fixedCity && COUNTIES.includes(fixedCity) ? fixedCity : "");

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
                <Label htmlFor="county">Județ</Label>
                <select id="county" name="county" required className={selectClass} defaultValue={county}>
                    <option value="" disabled>
                        Alege județul
                    </option>
                    {COUNTIES.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="city">Localitate</Label>
                {fixedCity ? (
                    <Input id="city" name="city" value={fixedCity} readOnly className="bg-neutral-50" />
                ) : (
                    <Input
                        id="city"
                        name="city"
                        autoComplete="address-level2"
                        maxLength={100}
                        defaultValue={defaults?.city ?? ""}
                        required
                    />
                )}
            </div>
            <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Adresă</Label>
                <Input
                    id="address"
                    name="address"
                    autoComplete="street-address"
                    placeholder="Stradă, număr, bloc, scară, apartament"
                    maxLength={200}
                    defaultValue={defaults?.address ?? ""}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="postalCode">Cod poștal (opțional)</Label>
                <Input
                    id="postalCode"
                    name="postalCode"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="postal-code"
                    defaultValue={defaults?.postalCode ?? ""}
                />
            </div>
        </div>
    );
}
