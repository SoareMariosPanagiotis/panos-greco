// Șabloanele mailurilor: din datele comenzii facem subiectul, textul și HTML-ul.
// Mailurile se construiesc cu tabele și stiluri scrise direct pe elemente,
// pentru că Gmail, Outlook și Yahoo ignoră o mare parte din CSS-ul modern.

const OLIVE = "#5a6b2e"; // aceeași culoare ca pe site
const OLIVE_LIGHT = "#f4f5ec";
const MUTED = "#6b7280";

// Ce a scris clientul (nume, adresă, notă) nu ajunge niciodată „crud” în HTML
function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function lei(amount) {
    const value = Number(amount).toLocaleString("ro-RO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${value} lei`;
}

// ---------- Ce spunem clientului la fiecare stare ----------

function customerMessage(status, order) {
    const n = order.order_number;

    switch (status) {
        case "new":
            return {
                subject: `Am primit comanda #${n}`,
                title: "Îți mulțumim pentru comandă!",
                lines: ["Am primit comanda ta și te contactăm în curând pentru confirmare."],
            };
        case "confirmed":
            return {
                subject: `Comanda #${n} a fost confirmată`,
                title: "Comanda ta e confirmată",
                lines: ["O pregătim acum. Te anunțăm când pleacă spre tine."],
            };
        case "ready_for_pickup":
            return {
                subject: `Comanda #${n} te așteaptă în magazin`,
                title: "Comanda ta e gata de ridicare",
                lines: ["O poți ridica din magazinul nostru din Galați. Te așteptăm!"],
            };
        case "shipped":
            return {
                subject: `Comanda #${n} a plecat spre tine`,
                title: "Comanda ta a plecat",
                lines: order.awb
                    ? [
                        `A fost predată curierului${order.courier ? ` ${order.courier}` : ""}.`,
                        `Numărul AWB: ${order.awb}`,
                    ]
                    : ["Comanda ta a plecat spre adresa de livrare."],
            };
        case "delivered":
            return {
                subject: `Comanda #${n} a fost livrată`,
                title: "Comanda ta a ajuns",
                lines: ["Îți mulțumim că ai ales Panos Greco. Poftă bună!"],
            };
        case "cancelled":
            return {
                subject: `Comanda #${n} a fost anulată`,
                title: "Comanda ta a fost anulată",
                lines: ["Dacă nu tu ai cerut anularea sau ai întrebări, răspunde la acest mail."],
            };
        default:
            return null; // stare necunoscută: nu trimitem nimic
    }
}

// ---------- Bucăți de HTML ----------

function layout(preheader, body) {
    return `<!doctype html>
<html lang="ro">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:${OLIVE_LIGHT};font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${OLIVE_LIGHT};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${OLIVE};padding:20px 28px;color:#ffffff;font-size:22px;font-weight:bold">Panos Greco</td></tr>
<tr><td style="padding:28px">${body}</td></tr>
<tr><td style="padding:16px 28px;background:#fafaf7;color:${MUTED};font-size:12px;line-height:1.5">
Panos Greco · Ulei de măsline extravirgin bio, din livada proprie<br>Ai întrebări? Răspunde la acest mail.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function itemsTable(order) {
    const cell = "padding:8px 0;border-bottom:1px solid #eeeeee";
    const rows = order.items
        .map(
            (item) => `<tr>
<td style="${cell}">${esc(item.quantity)} × ${esc(item.product_name)} <span style="color:${MUTED}">(${esc(item.size_label)})</span></td>
<td style="${cell};text-align:right;white-space:nowrap">${lei(item.line_total)}</td>
</tr>`,
        )
        .join("");

    const totals = [
        ["Produse", lei(order.subtotal)],
        Number(order.discount_total) > 0 ? ["Reducere", `− ${lei(order.discount_total)}`] : null,
        ["Livrare", Number(order.shipping_total) === 0 ? "Gratuit" : lei(order.shipping_total)],
        Number(order.payment_fee) > 0 ? ["Taxă plată", lei(order.payment_fee)] : null,
    ]
        .filter(Boolean)
        .map(
            ([label, value]) => `<tr>
<td style="padding:4px 0;color:${MUTED}">${label}</td>
<td style="padding:4px 0;text-align:right">${value}</td>
</tr>`,
        )
        .join("");

    const total = "padding-top:10px;font-size:16px;font-weight:bold;border-top:2px solid #e5e7eb";
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0">
${rows}${totals}
<tr><td style="${total}">Total</td><td style="${total};text-align:right">${lei(order.total)}</td></tr>
</table>`;
}

function detailsBlock(order) {
    const address = order.address
        ? `<br>${esc(order.address)}, ${esc(order.city)}, jud. ${esc(order.county)}${
            order.postal_code ? `, ${esc(order.postal_code)}` : ""
        }`
        : "";
    const company = order.company_name
        ? `<br><strong>Factură pe firmă:</strong> ${esc(order.company_name)}, CUI ${esc(order.company_cui)}`
        : "";

    return `<p style="margin:16px 0 0;font-size:14px;line-height:1.6">
<strong>Livrare:</strong> ${esc(order.delivery_name)}${address}
<br><strong>Plată:</strong> ${esc(order.payment_name)}${company}
</p>`;
}

function button(href, label) {
    return `<p style="margin:24px 0 0"><a href="${esc(href)}" style="display:inline-block;background:${OLIVE};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${esc(label)}</a></p>`;
}

// Varianta doar text, pentru programele de mail care nu afișează HTML
function itemsText(order) {
    const lines = order.items.map(
        (item) => `${item.quantity} × ${item.product_name} (${item.size_label}): ${lei(item.line_total)}`,
    );
    return [...lines, `Total: ${lei(order.total)}`].join("\n");
}

// ---------- Mailul pentru client ----------

function customerEmail(status, message, order, config) {
    const link = `${config.siteUrl}/comanda/confirmare/${order.id}`;
    // Lista de produse apare doar în primul mail, cel de confirmare a comenzii
    const showItems = status === "new";

    const body = `<h1 style="margin:0 0 12px;font-size:22px;color:${OLIVE}">${esc(message.title)}</h1>
<p style="margin:0 0 8px;font-size:15px">Bună, ${esc(order.customer_name)}!</p>
${message.lines.map((line) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.5">${esc(line)}</p>`).join("")}
${showItems ? itemsTable(order) + detailsBlock(order) : ""}
${button(link, `Vezi comanda #${order.order_number}`)}`;

    const text = [
        `Bună, ${order.customer_name}!`,
        "",
        ...message.lines,
        "",
        showItems ? itemsText(order) : "",
        `Vezi comanda: ${link}`,
    ].join("\n");

    return {
        from: config.from,
        to: order.email,
        replyTo: config.shopEmail, // răspunsurile clientului ajung la tine
        subject: message.subject,
        text,
        html: layout(message.subject, body),
    };
}

// ---------- Mailul pentru tine, la fiecare comandă nouă ----------

function shopEmail(order, config) {
    const link = `${config.siteUrl}/admin/comenzi/${order.order_number}`;
    const note = order.customer_note
        ? `<p style="margin:16px 0 0;padding:12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:14px"><strong>Nota clientului:</strong> ${esc(order.customer_note)}</p>`
        : "";

    const body = `<h1 style="margin:0 0 12px;font-size:22px;color:${OLIVE}">Comandă nouă #${order.order_number}</h1>
<p style="margin:0;font-size:15px;line-height:1.6">
<strong>${esc(order.customer_name)}</strong><br>${esc(order.phone)} · ${esc(order.email)}
</p>
${note}
${itemsTable(order)}
${detailsBlock(order)}
${button(link, "Deschide comanda în admin")}`;

    const text = [
        `Comandă nouă #${order.order_number}`,
        `${order.customer_name}, ${order.phone}, ${order.email}`,
        order.customer_note ? `Nota clientului: ${order.customer_note}` : "",
        "",
        itemsText(order),
        `Deschide în admin: ${link}`,
    ].join("\n");

    return {
        from: config.from,
        to: config.shopEmail,
        replyTo: order.email, // apeși „Răspunde” și îi scrii direct clientului
        subject: `Comandă nouă #${order.order_number} · ${lei(order.total)}`,
        text,
        html: layout(`Comandă nouă de la ${order.customer_name}`, body),
    };
}

// ---------- Ce mailuri pleacă pentru o schimbare de stare ----------

export function buildEmails(status, order, config) {
    const message = customerMessage(status, order);
    if (!message) return [];

    const emails = [];
    if (status === "new") emails.push(shopEmail(order, config));
    emails.push(customerEmail(status, message, order, config));
    return emails;
}