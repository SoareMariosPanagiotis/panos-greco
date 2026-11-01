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
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/catalog";
import { COUNTIES } from "@/lib/counties";

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

type Props = {
    deliveryOptions: DeliveryOption[];
    paymentOptions: PaymentOption[];
};

const initialState: CheckoutState = { error: null };

const selectClass =
    "h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:border-olive";

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border bg-white p-6">
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

export function CheckoutForm({ deliveryOptions, paymentOptions }: Props) {
    const { items, clearCart } = useCart();
    const router = useRouter();
    const [state, formAction, pending] = useActionState(submitOrder, initialState);

    const [deliveryCode, setDeliveryCode] = useState(deliveryOptions[0]?.code ?? "");
    const [paymentCode, setPaymentCode] = useState(paymentOptions[0]?.code ?? "");
    const [wantsInvoice, setWantsInvoice] = useState(false);
    const [accepted, setAccepted] = useState(false);

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
        <form action={formAction} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
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
                                defaultValue={values?.lastName ?? ""}
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
                                defaultValue={values?.firstName ?? ""}
                                maxLength={50}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                defaultValue={values?.email ?? ""}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefon</Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                placeholder="0722 123 456"
                                defaultValue={values?.phone ?? ""}
                                required
                            />
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
                        {/* key: când schimbi metoda de livrare, câmpurile pornesc de la zero */}
                        <div key={delivery.code} className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="county">Județ</Label>
                                <select
                                    id="county"
                                    name="county"
                                    required
                                    className={selectClass}
                                    defaultValue={
                                        values?.county ??
                                        (delivery.city && COUNTIES.includes(delivery.city) ? delivery.city : "")
                                    }
                                >
                                    <option value="" disabled>
                                        Alege județul
                                    </option>
                                    {COUNTIES.map((county) => (
                                        <option key={county} value={county}>
                                            {county}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">Localitate</Label>
                                {delivery.city ? (
                                    <Input id="city" name="city" value={delivery.city} readOnly className="bg-neutral-50" />
                                ) : (
                                    <Input
                                        id="city"
                                        name="city"
                                        autoComplete="address-level2"
                                        defaultValue={values?.city ?? ""}
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
                                    defaultValue={values?.address ?? ""}
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
                                    defaultValue={values?.postalCode ?? ""}
                                />
                            </div>
                        </div>
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
                    {wantsInvoice && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="companyName">Numele firmei</Label>
                                <Input
                                    id="companyName"
                                    name="companyName"
                                    autoComplete="organization"
                                    defaultValue={values?.companyName ?? ""}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="companyCui">CUI</Label>
                                <Input
                                    id="companyCui"
                                    name="companyCui"
                                    placeholder="RO12345678"
                                    defaultValue={values?.companyCui ?? ""}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="companyRegNo">Nr. Registrul Comerțului (opțional)</Label>
                                <Input
                                    id="companyRegNo"
                                    name="companyRegNo"
                                    placeholder="J17/123/2020"
                                    defaultValue={values?.companyRegNo ?? ""}
                                />
                            </div>
                        </div>
                    )}
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

            <aside className="h-fit space-y-4 rounded-xl border bg-white p-6 lg:sticky lg:top-6">
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
                                    În stoc sunt doar {line.stock} buc. Modifică cantitatea din coș.
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