import Image from "next/image";
import {
    formatInvoiceDate,
    formatMoney,
    formatQuantity,
    formatRate,
    formatUnitPrice,
    invoiceNumber,
    taxIdLabel,
    vatBreakdown,
    type Invoice,
} from "@/lib/invoices";
import type { ShopInfo } from "@/lib/shop-info";

// Factura, pe o pagină A4: o vezi în admin și o tipărești sau o salvezi ca PDF din browser.
// O ciornă arată datele firmei de azi și scrie mare „CIORNĂ”; o factură emisă arată datele
// copiate în momentul emiterii, care nu se mai schimbă.
export function InvoiceDocument({ invoice, shop }: { invoice: Invoice; shop: ShopInfo }) {
    const draft = invoice.status === "draft";
    const storno = invoice.kind === "storno";
    const seller = draft
        ? { name: shop.legalName, cui: shop.cui, regCom: shop.regCom, address: shop.registeredOffice }
        : {
              name: invoice.sellerName,
              cui: invoice.sellerCui,
              regCom: invoice.sellerRegCom,
              address: invoice.sellerAddress,
          };
    const lines = invoice.invoiceLinesByInvoiceId.nodes;
    const original = invoice.invoiceByStornoOf;

    return (
        <article className="relative mx-auto w-full max-w-[210mm] overflow-hidden rounded-xl border bg-white p-5 text-[13px] sm:p-10 leading-snug text-neutral-900 print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:p-0">
            {draft && (
                <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="-rotate-30 select-none text-8xl font-black tracking-widest text-neutral-200/80">
                        CIORNĂ
                    </span>
                </div>
            )}

            <header className="relative grid gap-6 border-b pb-6 sm:grid-cols-[1fr_auto]">
                <div className="flex items-start gap-4">
                    <Image src="/logo.svg" alt="" width={496} height={412} className="h-16 w-auto" />
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-neutral-500">Furnizor</p>
                        <p className="font-semibold">{seller.name}</p>
                        {seller.cui && <p>CUI: {seller.cui}</p>}
                        {seller.regCom && <p>Nr. Reg. Com.: {seller.regCom}</p>}
                        {seller.address && <p className="max-w-xs">Sediul: {seller.address}</p>}
                    </div>
                </div>

                <div className="sm:text-right">
                    <h1 className={`font-bold tracking-wide text-olive ${storno ? "text-xl" : "text-2xl"}`}>
                        {storno ? "FACTURĂ DE STORNARE" : "FACTURĂ"}
                    </h1>
                    {draft ? (
                        <p className="mt-1">Numărul și data le primește la emitere</p>
                    ) : (
                        <>
                            <p className="mt-1 text-base">
                                Seria <strong>{invoice.series}</strong> nr. <strong>{invoice.number}</strong>
                            </p>
                            <p>Data emiterii: {formatInvoiceDate(invoice.issueDate)}</p>
                        </>
                    )}
                    {original && (
                        <p className="mt-1">
                            Stornează factura {invoiceNumber(original)} din {formatInvoiceDate(original.issueDate)}
                        </p>
                    )}
                    {invoice.orderByOrderId && (
                        <p className="text-neutral-500">Comanda online #{invoice.orderByOrderId.orderNumber}</p>
                    )}
                </div>
            </header>

            <section className="relative mt-6">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">Cumpărător</p>
                <p className="font-semibold">{invoice.buyerName}</p>
                {invoice.buyerCui && (
                    <p>
                        {taxIdLabel(invoice.buyerCui)}: {invoice.buyerCui}
                    </p>
                )}
                {invoice.buyerRegCom && <p>Nr. Reg. Com.: {invoice.buyerRegCom}</p>}
                {invoice.buyerAddress && <p>Adresa: {invoice.buyerAddress}</p>}
            </section>

            {/* Pe telefon, tabelul se derulează lateral; pe hârtie încape pe lățimea foii */}
            <div className="relative mt-6 overflow-x-auto print:overflow-visible">
                <table className="w-full min-w-[600px] border-collapse text-[12px]">
                    <thead>
                        <tr className="border-y bg-neutral-50 text-left align-bottom">
                            <th className="py-2 pr-2 font-medium">Nr.</th>
                            <th className="py-2 pr-2 font-medium">Denumirea produselor</th>
                            <th className="py-2 pr-2 font-medium">U.M.</th>
                            <th className="py-2 pr-2 text-right font-medium">Cant.</th>
                            <th className="py-2 pr-2 text-right font-medium">
                                Preț unitar
                                <br />
                                fără TVA
                            </th>
                            <th className="py-2 pr-2 text-right font-medium">
                                Valoare
                                <br />
                                fără TVA
                            </th>
                            <th className="py-2 pr-2 text-right font-medium">TVA</th>
                            <th className="py-2 text-right font-medium">
                                Valoare
                                <br />
                                TVA
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) => (
                            <tr key={line.id} className="border-b align-top break-inside-avoid">
                                <td className="py-2 pr-2">{line.lineNo}</td>
                                <td className="py-2 pr-2">{line.description}</td>
                                <td className="py-2 pr-2">{line.unit}</td>
                                <td className="py-2 pr-2 text-right tabular-nums">{formatQuantity(line.quantity)}</td>
                                <td className="py-2 pr-2 text-right tabular-nums">{formatUnitPrice(line.unitPriceNet)}</td>
                                <td className="py-2 pr-2 text-right tabular-nums">{formatMoney(line.net)}</td>
                                <td className="py-2 pr-2 text-right tabular-nums">{formatRate(line.vatRate)}</td>
                                <td className="py-2 text-right tabular-nums">{formatMoney(line.vat)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="relative mt-6 flex flex-wrap items-start justify-between gap-8 break-inside-avoid">
                <div className="max-w-sm space-y-1 text-neutral-700">
                    {invoice.paymentMethod && <p>Modalitate de plată: {invoice.paymentMethod}</p>}
                    {invoice.note && <p className="whitespace-pre-line">Mențiuni: {invoice.note}</p>}
                    <p className="pt-2 text-[11px] text-neutral-500">
                        Sumele sunt în lei. Factura este valabilă fără semnătură și ștampilă (art. 319 alin. (29) din
                        Codul fiscal).
                    </p>
                </div>

                <dl className="min-w-72 space-y-1 tabular-nums">
                    {vatBreakdown(lines).map((group) => (
                        <div key={group.rate} className="flex justify-between gap-6 text-neutral-600">
                            <dt>
                                Cota {group.rate}%: bază {formatMoney(group.net)}
                            </dt>
                            <dd>TVA {formatMoney(group.vat)}</dd>
                        </div>
                    ))}
                    <div className="flex justify-between gap-6 border-t pt-2">
                        <dt>Total fără TVA</dt>
                        <dd>{formatMoney(invoice.totalNet)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                        <dt>Total TVA</dt>
                        <dd>{formatMoney(invoice.totalVat)}</dd>
                    </div>
                    <div className="flex justify-between gap-6 border-t pt-2 text-base font-bold">
                        <dt>{storno ? "Total stornat" : "Total de plată"}</dt>
                        <dd>{formatMoney(invoice.total)} lei</dd>
                    </div>
                </dl>
            </div>
        </article>
    );
}
