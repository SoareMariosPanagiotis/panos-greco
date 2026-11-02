"use client";

import { useActionState, useState } from "react";
import { cn } from "cn";
import { FileDown, Mail, Printer } from "lucide-react";
import {
    createInvoiceDraft,
    createStornoDraft,
    discardInvoiceDraft,
    issueInvoice,
    resendInvoiceEmail,
    saveInvoiceDraft,
    type InvoiceActionState,
} from "@/app/admin/facturi/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    formatQuantity,
    invoicePdfHref,
    type EmailDelivery,
    type Invoice,
    type InvoiceLine,
    type PdfStatus,
} from "@/lib/invoices";
import { formatOrderDate } from "@/lib/orders";

const initialState: InvoiceActionState = { status: "idle", message: "" };

const olive = "bg-olive text-white hover:bg-olive/90";
const textareaClass =
    "w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-olive focus-visible:ring-2 focus-visible:ring-olive/20";

function Feedback({ state, pending }: { state: InvoiceActionState; pending: boolean }) {
    if (state.status === "error") {
        return (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.message}
            </p>
        );
    }
    if (state.status === "saved" && !pending) return <p className="text-sm text-green-700">✓ {state.message}</p>;
    return null;
}

// ---------- Pagina comenzii: „Fă ciorna facturii” ----------

export function CreateInvoiceButton({ orderId }: { orderId: string }) {
    const [state, formAction, pending] = useActionState(createInvoiceDraft, initialState);
    return (
        <form action={formAction} className="space-y-2">
            <input type="hidden" name="orderId" value={orderId} />
            <Button type="submit" disabled={pending} variant="outline">
                {pending ? "Se face ciorna..." : "Fă ciorna facturii"}
            </Button>
            <Feedback state={state} pending={pending} />
        </form>
    );
}

// ---------- Ciorna: datele clientului și mențiunile ----------

export function InvoiceDraftForm({ invoice }: { invoice: Invoice }) {
    const [state, formAction, pending] = useActionState(saveInvoiceDraft, initialState);
    const storno = invoice.kind === "storno";

    return (
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            {/* La stornare, clientul rămâne cel de pe factura inițială; se schimbă doar mențiunile */}
            {storno ? (
                <>
                    <input type="hidden" name="buyerName" value={invoice.buyerName} />
                    <p className="text-sm text-neutral-600">
                        Clientul rămâne cel de pe factura inițială: {invoice.buyerName}.
                    </p>
                </>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="buyerName">Client (persoană sau firmă)</Label>
                        <Input id="buyerName" name="buyerName" defaultValue={invoice.buyerName} maxLength={200} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="buyerCui">CUI sau CNP</Label>
                        <Input
                            id="buyerCui"
                            name="buyerCui"
                            defaultValue={invoice.buyerCui ?? ""}
                            placeholder="opțional pentru persoane"
                            maxLength={20}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="buyerRegCom">Nr. Reg. Com.</Label>
                        <Input id="buyerRegCom" name="buyerRegCom" defaultValue={invoice.buyerRegCom ?? ""} maxLength={40} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="buyerAddress">Adresa</Label>
                        <Input id="buyerAddress" name="buyerAddress" defaultValue={invoice.buyerAddress ?? ""} maxLength={300} />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="note">Mențiuni pe factură (opțional)</Label>
                <textarea
                    id="note"
                    name="note"
                    rows={2}
                    maxLength={500}
                    defaultValue={invoice.note ?? ""}
                    placeholder={storno ? "ex: Retur conform cererii din 3 noiembrie" : "ex: Mulțumim pentru comandă!"}
                    className={textareaClass}
                />
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={pending} variant="outline">
                    {pending ? "Se salvează..." : "Salvează ciorna"}
                </Button>
                <Feedback state={state} pending={pending} />
            </div>
        </form>
    );
}

// ---------- „Emite factura”, cu o a doua confirmare ----------

export function IssueInvoiceButton({ invoiceId, nextLabel }: { invoiceId: string; nextLabel: string | null }) {
    const [state, formAction, pending] = useActionState(issueInvoice, initialState);
    const [confirming, setConfirming] = useState(false);

    if (!confirming) {
        return (
            <div className="space-y-2">
                <Button type="button" onClick={() => setConfirming(true)} className={olive}>
                    Emite factura
                </Button>
                <Feedback state={state} pending={pending} />
            </div>
        );
    }

    return (
        <form action={formAction} className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <p>
                Factura primește numărul <strong>{nextLabel ?? "următor din serie"}</strong> și data de azi. După
                emitere nu se mai poate modifica sau șterge; o corectezi doar prin stornare.
            </p>
            <p className="text-neutral-600">Dacă ai schimbat datele clientului, salvează întâi ciorna.</p>
            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending} className={olive}>
                    {pending ? "Se emite..." : "Da, emite factura"}
                </Button>
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
                    Renunță
                </Button>
            </div>
            <Feedback state={state} pending={pending} />
        </form>
    );
}

// ---------- Aruncă ciorna ----------

export function DiscardDraftButton({ invoiceId, back }: { invoiceId: string; back: string }) {
    const [state, formAction, pending] = useActionState(discardInvoiceDraft, initialState);
    return (
        <form action={formAction} className="space-y-2">
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <input type="hidden" name="back" value={back} />
            <Button type="submit" disabled={pending} variant="ghost" className="text-red-700 hover:text-red-800">
                {pending ? "Se șterge..." : "Șterge ciorna"}
            </Button>
            <Feedback state={state} pending={pending} />
        </form>
    );
}

// ---------- Tipărire / PDF ----------

// Titlul paginii devine numele fișierului când alegi „Salvează ca PDF”
export function PrintInvoiceButton({ title }: { title: string }) {
    return (
        <Button
            type="button"
            variant="outline"
            onClick={() => {
                document.title = title;
                window.print();
            }}
        >
            <Printer aria-hidden />
            Tipărește
        </Button>
    );
}

// PDF-ul arhivat (migrația 030): exact fișierul primit de client pe email.
// Un link obișnuit, într-un tab nou: browserul îl deschide în cititorul lui de PDF.
export function DownloadInvoicePdf({ invoiceId }: { invoiceId: string }) {
    return (
        <a
            href={invoicePdfHref(invoiceId)}
            target="_blank"
            rel="noopener"
            className={cn(buttonVariants(), olive)}
        >
            <FileDown aria-hidden />
            Descarcă PDF
        </a>
    );
}

// E gata PDF-ul? Poștașul îl face în câteva secunde de la emitere.
export function InvoicePdfStatus({ status }: { status: PdfStatus | null }) {
    if (status?.ready && status.renderedAt) {
        const size = status.bytes ? ` (${Math.round(status.bytes / 1024)} KB)` : "";
        return <p className="text-sm text-green-700">✓ PDF arhivat pe {formatOrderDate(status.renderedAt)}{size}.</p>;
    }
    if (status?.lastError) {
        return (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                PDF-ul nu s-a putut face încă: {status.lastError}. Poștașul reîncearcă singur; vezi și{" "}
                <code>docker compose logs mailer</code>.
            </p>
        );
    }
    return <p className="text-sm text-neutral-600">PDF-ul se face în câteva secunde (îl face poștașul).</p>;
}

// ---------- Stornarea ----------

// Toată factura dintr-un click, sau doar unele produse (de exemplu, la un retur parțial)
export function StornoForm({ invoiceId, lines }: { invoiceId: string; lines: InvoiceLine[] }) {
    const [state, formAction, pending] = useActionState(createStornoDraft, initialState);
    const open = lines.filter((line) => Number(line.remainingQuantity) > 0);

    return (
        <form action={formAction} className="space-y-3">
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <p className="text-sm text-neutral-600">
                Stornarea face o ciornă de factură cu minus. O verifici și o emiți la fel ca pe o factură.
            </p>
            <Button type="submit" name="intent" value="all" disabled={pending} variant="outline">
                Stornează toată factura
            </Button>

            <details className="rounded-lg border px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">Doar unele produse</summary>
                <ul className="mt-3 space-y-2">
                    {open.map((line) => (
                        <li key={line.id} className="flex items-center justify-between gap-3 text-sm">
                            <label htmlFor={`qty-${line.id}`} className="min-w-0">
                                {line.description}
                                <span className="block text-xs text-neutral-500">
                                    se mai pot storna {formatQuantity(line.remainingQuantity)}
                                </span>
                            </label>
                            <Input
                                id={`qty-${line.id}`}
                                name={`qty-${line.id}`}
                                type="number"
                                min={0}
                                max={Number(line.remainingQuantity)}
                                step={1}
                                defaultValue={0}
                                className="w-20 shrink-0"
                            />
                        </li>
                    ))}
                </ul>
                <Button type="submit" name="intent" value="some" disabled={pending} variant="outline" className="mt-3">
                    {pending ? "Se face ciorna..." : "Fă ciorna de stornare"}
                </Button>
            </details>

            <Feedback state={state} pending={pending} />
        </form>
    );
}

// ---------- Emailul cu factura ----------

// Unde și când a plecat factura; dacă nu a plecat, de ce (poștașul reîncearcă singur de 8 ori)
export function InvoiceEmailStatus({ delivery, buyerEmail }: { delivery: EmailDelivery | null; buyerEmail: string | null }) {
    if (!delivery) {
        return (
            <p className="text-sm text-neutral-600">
                {buyerEmail ? "Factura nu a fost trimisă pe email." : "Comanda nu are adresă de email."}
            </p>
        );
    }
    if (delivery.sentAt) {
        return (
            <p className="text-sm text-green-700">
                ✓ Trimisă pe email la {delivery.email}, pe {formatOrderDate(delivery.sentAt)}.
            </p>
        );
    }
    if (delivery.attempts >= 8) {
        return (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Nu a putut fi trimisă la {delivery.email}: {delivery.lastError}
            </p>
        );
    }
    return (
        <p className="text-sm text-neutral-600">
            Pleacă pe email la {delivery.email} în câteva secunde
            {delivery.lastError ? ` (încercarea ${delivery.attempts} nu a mers: ${delivery.lastError})` : ""}.
        </p>
    );
}

export function ResendInvoiceEmailButton({ invoiceId }: { invoiceId: string }) {
    const [state, formAction, pending] = useActionState(resendInvoiceEmail, initialState);
    return (
        <form action={formAction} className="space-y-2">
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <Button type="submit" disabled={pending} variant="outline">
                <Mail aria-hidden />
                {pending ? "Se pune în coadă..." : "Trimite din nou pe email"}
            </Button>
            <Feedback state={state} pending={pending} />
        </form>
    );
}
