"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    getLiveVariants,
    submitOrder,
    type CheckoutState,
    type LiveVariant,
} from "@/app/comanda/actions";
import { AddressFields } from "@/components/address-fields";
import { useCart } from "@/components/cart-provider";
import { CompanyFields } from "@/components/checkout/company-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/catalog";
import { formatPlace, sameCity, type SavedAddress } from "@/lib/customer";
import { RETURN_FORM_LABEL } from "@/lib/withdrawals";

export type DeliveryOption = {
    code: string;
    name: string;
    description: string | null;
    price: string;
    freeOver: string | null;
    needsAddress: boolean;
    city: string | null;
};

export type PaymentOption = {
    code: string;
    name: string;
    description: string | null;
    fee: string;
};

// Clientul conectat: completăm formularul cu datele din cont (vezi app/comanda/page.tsx)
export type CheckoutAccount = {
    lastName: string;
    firstName: string;
    email: string;
    phone: string;
    addresses: SavedAddress[]; // implicita prima
};

type Props = {
    deliveryOptions: DeliveryOption[];
    paymentOptions: PaymentOption[];
    account: CheckoutAccount | null; // null = vizitator
};

const initialState: CheckoutState = { error: null };

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold">{title}</h2>
            <div className="mt-4 space-y-4">{children}</div>
        </section>
    );
}

type ChoiceProps = {
    name: string;
    value: string;
    checked: boolean;
    onSelect: () => void;
    title: string;
    price?: string;
    description?: string | null;
    note?: string | null;
};

// Un card care se poate alege (livrare sau plată)
function ChoiceCard({ name, value, checked, onSelect, title, price, description, note }: ChoiceProps) {
    return (
        <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                checked ? "border-olive bg-olive-light" : "hover:border-olive"
            }`}
        >
            <input
                type="radio"
                name={name}
                value={value}
                checked={checked}
                onChange={onSelect}
                className="mt-1 size-4 accent-olive"
            />
            <span className="flex-1">
        <span className="flex justify-between gap-4 font-medium">
          <span>{title}</span>
            {price && <span className="whitespace-nowrap">{price}</span>}
        </span>
                {description && <span className="mt-1 block text-sm text-neutral-600">{description}</span>}
                {note && <span className="mt-1 block text-sm text-olive">{note}</span>}
      </span>
        </label>
    );
}

export function CheckoutForm({ deliveryOptions, paymentOptions, account }: Props) {
    const { items, clearCart } = useCart();
    const router = useRouter();
    const [state, formAction, pending] = useActionState(submitOrder, initialState);

    const [deliveryCode, setDeliveryCode] = useState(deliveryOptions[0]?.code ?? "");
    const [paymentCode, setPaymentCode] = useState(paymentOptions[0]?.code ?? "");
    const [wantsInvoice, setWantsInvoice] = useState(false);
    const [accepted, setAccepted] = useState(false);
    // Adresa de livrare: id-ul unei adrese salvate sau "new" (o scrie acum). Pornim de la cea implicită.
    const [addressChoice, setAddressChoice] = useState(account?.addresses[0]?.id ?? "new");

    // ---------- Prețurile reale, cerute din baza de date ----------
    const [live, setLive] = useState<Record<string, LiveVariant> | null>(null);
    const [priceError, setPriceError] = useState(false);
    const idsKey = items
        .map((item) => item.variantId)
        .sort()
        .join(",");

    useEffect(() => {
        if (!idsKey) return;
        let ignore = false;
        getLiveVariants(idsKey.split(","))
            .then((variants) => {
                if (!ignore) setLive(Object.fromEntries(variants.map((variant) => [variant.id, variant])));
            })
            .catch(() => {
                if (!ignore) setPriceError(true);
            });
        return () => {
            ignore = true;
        };
    }, [idsKey]);

    // ---------- După plasare: golim coșul și mergem la confirmare (o singură dată) ----------
    const redirected = useRef(false);
    useEffect(() => {
        if (!state.orderId || redirected.current) return;
        redirected.current = true;
        clearCart();
        router.push(`/comanda/confirmare/${state.orderId}`);
    }, [state.orderId, clearCart, router]);

    if (state.orderId) {
        return <p className="mt-8 text-neutral-600">Comanda a fost plasată. Te ducem la confirmare...</p>;
    }

    if (items.length === 0) {
        return (
            <div className="mt-8 rounded-xl border bg-white p-10 text-center">
                <p className="text-neutral-600">Coșul tău este gol.</p>
                <Link href="/" className="mt-4 inline-block font-medium text-olive hover:underline">
                    Vezi produsele
                </Link>
            </div>
        );
    }

    // ---------- Calcule, cu prețurile REALE ----------
    const delivery = deliveryOptions.find((option) => option.code === deliveryCode);
    const payment = paymentOptions.find((option) => option.code === paymentCode);

    // Adresele salvate care merg cu livrarea aleasă: la livrarea locală, doar cele din orașul ei
    const savedChoices = (account?.addresses ?? []).filter(
        (saved) => !delivery?.city || sameCity(saved.city, delivery.city),
    );
    // Adresa folosită: cea aleasă; dacă nu merge cu livrarea, prima care merge; null = o scrie acum
    const chosenAddress =
        addressChoice === "new"
            ? null
            : (savedChoices.find((saved) => saved.id === addressChoice) ?? savedChoices[0] ?? null);

    const lines = items.map((item) => {
        const current = live?.[item.variantId];
        return {
            variantId: item.variantId,
            name: current?.productName ?? item.productName,
            sizeLabel: current?.sizeLabel ?? item.sizeLabel,
            quantity: item.quantity,
            unitPrice: current ? Number(current.price) : null,
            stock: current?.stock ?? 0,
            unavailable: live !== null && !current,
            priceChanged: current !== undefined && Number(current.price) !== Number(item.price),
        };
    });

    const subtotal = lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0);
    const freeOver = delivery?.freeOver ? Number(delivery.freeOver) : null;
    const shipping = delivery
        ? freeOver !== null && subtotal >= freeOver
            ? 0
            : Number(delivery.price)
        : 0;
    const fee = payment ? Number(payment.fee) : 0;
    const total = subtotal + shipping + fee;

    const hasProblem = lines.some(
        (line) => line.unavailable || (line.unitPrice !== null && line.quantity > line.stock),
    );
    const canSubmit = live !== null && !hasProblem && !pending && Boolean(delivery) && Boolean(payment);
    const values = state.values;

    return (
        <form action={formAction} className="mt-6 grid gap-4 sm:mt-8 sm:gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4 sm:space-y-6">
                {/* Din coș trimitem doar mărimea și cantitatea, NU prețul */}
                {items.map((item) => (
                    <span key={item.variantId} hidden>
            <input type="hidden" name="variantId" value={item.variantId} />
            <input type="hidden" name="quantity" value={item.quantity} />
          </span>
                ))}

                {/* Capcană pentru roboți: oamenii nu văd câmpul, roboții îl completează */}
                <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                />

                <Section title="Date de contact">
                    {/* Nume și prenume separat, ca la cont (vezi migrația 017) */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Nume</Label>
                            <Input
                                id="lastName"
                                name="lastName"
                                autoComplete="family-name"
                                defaultValue={values?.lastName ?? account?.lastName ?? ""}
                                maxLength={50}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="firstName">Prenume</Label>
                            <Input
                                id="firstName"
                                name="firstName"
                                autoComplete="given-name"
                                defaultValue={values?.firstName ?? account?.firstName ?? ""}
                                maxLength={50}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            {account ? (
                                // Cu cont, comanda merge pe emailul contului: acolo vin confirmările
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={account.email}
                                    readOnly
                                    className="bg-neutral-50 text-neutral-600"
                                />
                            ) : (
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    defaultValue={values?.email ?? ""}
                                    required
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefon</Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                placeholder="0722 123 456"
                                defaultValue={values?.phone ?? account?.phone ?? ""}
                                required
                            />
                            {account && !account.phone && (
                                <p className="text-xs text-neutral-500">Îl păstrăm în cont pentru comenzile viitoare.</p>
                            )}
                        </div>
                    </div>
                </Section>

                <Section title="Livrare">
                    {deliveryOptions.map((option) => {
                        const free = option.freeOver !== null && subtotal >= Number(option.freeOver);
                        return (
                            <ChoiceCard
                                key={option.code}
                                name="deliveryCode"
                                value={option.code}
                                checked={deliveryCode === option.code}
                                onSelect={() => setDeliveryCode(option.code)}
                                title={option.name}
                                price={free || Number(option.price) === 0 ? "Gratuit" : formatPrice(option.price)}
                                description={option.description}
                                note={
                                    option.freeOver && Number(option.price) > 0
                                        ? `Gratuit la comenzi de peste ${formatPrice(option.freeOver)}`
                                        : null
                                }
                            />
                        );
                    })}
                </Section>

                {delivery?.needsAddress && (
                    <Section title="Adresa de livrare">
                        {/* Adresele salvate în cont */}
                        {savedChoices.map((saved) => (
                            <ChoiceCard
                                key={saved.id}
                                name="addressChoice"
                                value={saved.id}
                                checked={chosenAddress?.id === saved.id}
                                onSelect={() => setAddressChoice(saved.id)}
                                title={saved.address}
                                description={formatPlace(saved)}
                                note={saved.isDefault ? "Adresa implicită" : null}
                            />
                        ))}
                        {savedChoices.length > 0 && (
                            <ChoiceCard
                                name="addressChoice"
                                value="new"
                                checked={chosenAddress === null}
                                onSelect={() => setAddressChoice("new")}
                                title="Altă adresă"
                            />
                        )}

                        {chosenAddress ? (
                            // Adresa salvată pleacă prin câmpuri ascunse, cu aceleași nume ca formularul
                            // de mai jos: pentru server e o comandă ca oricare alta
                            <>
                                <input type="hidden" name="county" value={chosenAddress.county} />
                                <input type="hidden" name="city" value={chosenAddress.city} />
                                <input type="hidden" name="address" value={chosenAddress.address} />
                                <input type="hidden" name="postalCode" value={chosenAddress.postalCode ?? ""} />
                            </>
                        ) : (
                            <>
                                {/* key: la altă metodă de livrare sau la valori noi de la server (după o eroare),
                                    câmpurile pornesc din nou, de la valorile primite */}
                                <AddressFields
                                    key={[delivery.code, values?.county, values?.city].join("|")}
                                    defaults={values}
                                    fixedCity={delivery.city}
                                />
                                {account && (
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            name="saveAddress"
                                            defaultChecked
                                            className="size-4 accent-olive"
                                        />
                                        Salvează adresa în cont pentru comenzile viitoare
                                    </label>
                                )}
                            </>
                        )}
                    </Section>
                )}

                <Section title="Facturare">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="wantsInvoice"
                            checked={wantsInvoice}
                            onChange={(event) => setWantsInvoice(event.target.checked)}
                            className="size-4 accent-olive"
                        />
                        Vreau factură pe firmă
                    </label>
                    {/* Întâi doar CUI-ul; după „Caută” apar numele, adresa sediului și Nr. Reg. Com., completate singure */}
                    {wantsInvoice && <CompanyFields defaults={values} />}
                </Section>

                <Section title="Plata">
                    {paymentOptions.map((option) => (
                        <ChoiceCard
                            key={option.code}
                            name="paymentCode"
                            value={option.code}
                            checked={paymentCode === option.code}
                            onSelect={() => setPaymentCode(option.code)}
                            title={option.name}
                            price={Number(option.fee) > 0 ? `+ ${formatPrice(option.fee)}` : undefined}
                            description={option.description}
                        />
                    ))}
                </Section>

                <Section title="Observații (opțional)">
          <textarea
              name="customerNote"
              rows={3}
              maxLength={500}
              placeholder="Ex: sunați înainte de livrare"
              defaultValue={values?.customerNote ?? ""}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-olive"
          />
                </Section>
            </div>

            <aside className="h-fit space-y-4 rounded-xl border bg-white p-4 sm:p-6 lg:sticky lg:top-6">
                <h2 className="text-lg font-semibold">Sumar comandă</h2>

                {live === null && !priceError && (
                    <p className="text-sm text-neutral-500">Se verifică prețurile...</p>
                )}
                {priceError && (
                    <p className="text-sm text-red-600">Nu am putut verifica prețurile. Reîncarcă pagina.</p>
                )}

                <ul className="divide-y">
                    {lines.map((line) => (
                        <li key={line.variantId} className="py-3 text-sm">
                            <div className="flex justify-between gap-3">
                <span>
                  {line.quantity} × {line.name}{" "}
                    <span className="text-neutral-500">({line.sizeLabel})</span>
                </span>
                                <span className="whitespace-nowrap font-medium">
                  {line.unitPrice !== null ? formatPrice(String(line.unitPrice * line.quantity)) : "—"}
                </span>
                            </div>
                            {line.unavailable && (
                                <p className="mt-1 text-red-600">Produsul nu mai este disponibil. Șterge-l din coș.</p>
                            )}
                            {line.unitPrice !== null && line.quantity > line.stock && (
                                <p className="mt-1 text-red-600">
                                    {/* „doar 0 buc.” sună ciudat: dacă nu mai e deloc, o spunem direct */}
                                    {line.stock > 0
                                        ? `În stoc sunt doar ${line.stock} buc. Modifică cantitatea din coș.`
                                        : "Produsul nu mai e în stoc. Șterge-l din coș."}
                                </p>
                            )}
                            {line.priceChanged && line.unitPrice !== null && (
                                <p className="mt-1 text-amber-700">
                                    Prețul s-a actualizat: acum {formatPrice(String(line.unitPrice))} / buc.
                                </p>
                            )}
                        </li>
                    ))}
                </ul>

                <dl className="space-y-2 border-t pt-4 text-sm">
                    <div className="flex justify-between">
                        <dt>Produse</dt>
                        <dd>{formatPrice(String(subtotal))}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt>Livrare</dt>
                        <dd>{shipping === 0 ? "Gratuit" : formatPrice(String(shipping))}</dd>
                    </div>
                    {fee > 0 && (
                        <div className="flex justify-between">
                            <dt>Taxă plată</dt>
                            <dd>{formatPrice(String(fee))}</dd>
                        </div>
                    )}
                    <div className="flex justify-between border-t pt-3 text-lg font-bold">
                        <dt>Total</dt>
                        <dd>{formatPrice(String(total))}</dd>
                    </div>
                </dl>

                {freeOver !== null && shipping > 0 && subtotal < freeOver && (
                    <p className="rounded-lg bg-olive-light px-3 py-2 text-sm text-olive">
                        Mai adaugă produse de {formatPrice(String(freeOver - subtotal))} și livrarea devine
                        gratuită.
                    </p>
                )}
                <p className="text-xs text-neutral-500">Prețurile includ TVA.</p>

                <label className="flex items-start gap-2 text-sm">
                    <input
                        type="checkbox"
                        name="acceptTerms"
                        checked={accepted}
                        onChange={(event) => setAccepted(event.target.checked)}
                        required
                        className="mt-0.5 size-4 accent-olive"
                    />
                    <span>
            Am citit și accept{" "}
                        <Link href="/termeni" className="text-olive underline">
              termenii și condițiile
            </Link>{" "}
                        și{" "}
                        <Link href="/confidentialitate" className="text-olive underline">
              politica de confidențialitate
            </Link>
            .
          </span>
                </label>

                {/* Informarea de dinainte de comandă despre dreptul de retur (retragere, OUG 34/2014) */}
                <p className="text-xs leading-relaxed text-neutral-500">
                    Poți returna produsele în 14 zile de la primire, fără să ne spui motivul, din „
                    {RETURN_FORM_LABEL}” (în subsolul site-ului), din contul tău sau din mailul de confirmare.
                    Costul transportului de retur e al tău, iar alimentele desigilate nu pot fi returnate. Detalii în{" "}
                    <Link href="/retur" className="text-olive underline">
                        Politica de retur
                    </Link>
                    .
                </p>

                {state.error && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {state.error}
                    </p>
                )}

                <Button
                    type="submit"
                    size="lg"
                    disabled={!canSubmit}
                    className="w-full bg-olive py-6 text-base hover:bg-olive/90"
                >
                    {pending ? "Se plasează comanda..." : `Plasează comanda · ${formatPrice(String(total))}`}
                </Button>
                {hasProblem && (
                    <p className="text-sm text-red-600">Rezolvă problemele din coș înainte de a plasa comanda.</p>
                )}

                <Link href="/cos" className="block text-center text-sm text-olive hover:underline">
                    ← Înapoi la coș
                </Link>
            </aside>
        </form>
    );
}