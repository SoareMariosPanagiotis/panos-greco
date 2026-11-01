"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { requestWithdrawal, type WithdrawalState } from "@/app/retur/formular/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONFIRM_LABEL, formatRequestTime, type WithdrawalFormData } from "@/lib/withdrawals";

type OpenForm = Extract<WithdrawalFormData, { canWithdraw: true }>;

type WithdrawalFormProps = {
    data: OpenForm;
    returnAddress: string | null; // adresa magazinului, din „Datele firmei”
};

const initialState: WithdrawalState = { done: false, error: null };

const textareaClass =
    "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-olive/20";

// Formularul de retur, adică declarația de retragere cerută de lege: numele, contractul (comanda
// și produsele), emailul pentru confirmare și un buton separat de confirmare. Motivul și IBAN-ul sunt opționale.
export function ReturnForm({ data, returnAddress }: WithdrawalFormProps) {
    const [state, formAction, pending] = useActionState(requestWithdrawal, initialState);

    if (state.done && state.createdAt && state.statement) {
        return (
            <WithdrawalReceived
                createdAt={state.createdAt}
                email={state.email ?? data.email}
                statement={state.statement}
                returnAddress={returnAddress}
            />
        );
    }

    // La eroare păstrăm ce a scris clientul; altfel pornim de la datele comenzii
    const values = state.values;
    const available = data.items.filter((item) => item.remaining > 0);
    const alreadyRequested = data.items.filter((item) => item.remaining === 0);

    return (
        <form action={formAction} className="space-y-6 rounded-xl border bg-white p-6 sm:p-8">
            <input type="hidden" name="orderId" value={data.orderId} />

            <fieldset className="space-y-3">
                <legend className="font-semibold">Ce produse returnezi?</legend>
                <ul className="divide-y rounded-lg border">
                    {available.map((item) => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="item"
                                    value={item.id}
                                    defaultChecked={values ? item.id in values.items : true}
                                    className="size-4 accent-olive"
                                />
                                <span>
                                    {item.productName} <span className="text-neutral-500">({item.sizeLabel})</span>
                                </span>
                            </label>
                            {item.remaining > 1 ? (
                                <label className="flex items-center gap-2 text-neutral-600">
                                    <Input
                                        type="number"
                                        name={`qty-${item.id}`}
                                        min={1}
                                        max={item.remaining}
                                        step={1}
                                        defaultValue={values?.items[item.id] ?? item.remaining}
                                        className="w-20"
                                    />
                                    <span>din {item.remaining} buc.</span>
                                </label>
                            ) : (
                                <span className="text-neutral-500">1 buc.</span>
                            )}
                        </li>
                    ))}
                    {alreadyRequested.map((item) => (
                        <li key={item.id} className="px-4 py-3 text-sm text-neutral-400">
                            {item.productName} ({item.sizeLabel}): retur deja cerut
                        </li>
                    ))}
                </ul>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="customerName">Numele și prenumele</Label>
                    <Input
                        id="customerName"
                        name="customerName"
                        autoComplete="name"
                        maxLength={100}
                        defaultValue={values?.customerName ?? data.customerName}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Emailul pentru confirmare</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        defaultValue={values?.email ?? data.email}
                        required
                    />
                </div>
            </div>

            {/* La plata ramburs nu avem un card în care să returnăm banii: avem nevoie de un cont */}
            {data.paidOnDelivery && (
                <div className="space-y-2">
                    <Label htmlFor="iban">
                        IBAN-ul în care îți returnăm banii{" "}
                        <span className="font-normal text-neutral-500">(opțional)</span>
                    </Label>
                    <Input
                        id="iban"
                        name="iban"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="RO49 AAAA 1B31 0075 9384 0000"
                        defaultValue={values?.iban ?? ""}
                    />
                    <p className="text-xs text-neutral-500">
                        Ai plătit la livrare, așa că banii îi returnăm prin transfer bancar. Dacă nu îl scrii acum, ni-l
                        poți trimite răspunzând la mailul de confirmare.
                    </p>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="reason">
                    De ce returnezi? <span className="font-normal text-neutral-500">(opțional)</span>
                </Label>
                <textarea
                    id="reason"
                    name="reason"
                    rows={3}
                    maxLength={1000}
                    className={textareaClass}
                    defaultValue={values?.reason ?? ""}
                />
                <p className="text-xs text-neutral-500">
                    Nu ești obligat să ne spui motivul. Dacă ni-l spui, ne ajuți să facem lucrurile mai bine.
                </p>
            </div>

            {state.error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <div className="space-y-2 border-t pt-6">
                <Button
                    type="submit"
                    size="lg"
                    disabled={pending}
                    className="w-full bg-olive py-6 text-base hover:bg-olive/90 sm:w-auto sm:px-8"
                >
                    {pending ? "Se trimite..." : CONFIRM_LABEL}
                </Button>
                <p className="text-xs text-neutral-500">
                    Imediat ce apeși, îți trimitem pe email confirmarea, cu data și ora cererii.
                </p>
            </div>
        </form>
    );
}

type ReceivedProps = {
    createdAt: string;
    email: string;
    statement: string;
    returnAddress: string | null;
};

// Ce vede clientul după „Confirmă returul”: aceeași confirmare primește și pe email
function WithdrawalReceived({ createdAt, email, statement, returnAddress }: ReceivedProps) {
    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-white p-8 text-center">
                <CircleCheck className="mx-auto size-12 text-green-700" />
                <h2 className="mt-4 text-2xl font-bold text-olive">Am primit cererea ta de retur</h2>
                <p className="mt-2 text-neutral-700">Trimisă pe {formatRequestTime(createdAt)}.</p>
                <p className="mt-1 text-sm text-neutral-600">
                    Ți-am trimis confirmarea pe email, la <strong>{email}</strong>.
                </p>
            </div>

            <section className="rounded-xl border bg-white p-6 text-sm">
                <h3 className="font-semibold">Declarația ta</h3>
                <blockquote className="mt-3 border-l-4 border-olive/40 bg-olive-light px-4 py-3 text-neutral-700">
                    {statement}
                </blockquote>
            </section>

            <section className="rounded-xl border bg-white p-6 text-sm">
                <h3 className="font-semibold">Ce urmează</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-neutral-700">
                    <li>
                        Trimite-ne produsele înapoi în cel mult 14 zile,{" "}
                        {returnAddress ? (
                            <>
                                la adresa: <strong>{returnAddress}</strong>.
                            </>
                        ) : (
                            "la adresa pe care ți-o trimitem pe email."
                        )}{" "}
                        Dacă nu ai primit încă coletul, îl poți refuza la livrare.
                    </li>
                    <li>Păstrează produsele sigilate: alimentele desfăcute nu mai pot fi returnate, din motive de igienă.</li>
                    <li>
                        Îți returnăm banii în cel mult 14 zile de la primirea cererii. Putem aștepta până primim produsele
                        sau dovada că le-ai trimis.
                    </li>
                    <li>Costul transportului pentru retur e al tău.</li>
                </ol>
                <p className="mt-4">
                    Toate detaliile sunt în{" "}
                    <Link href="/retur" className="font-medium text-olive underline">
                        Politica de retur
                    </Link>
                    .
                </p>
            </section>
        </div>
    );
}
