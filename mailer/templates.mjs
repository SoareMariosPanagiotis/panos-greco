// Șabloanele mailurilor: din datele comenzii facem subiectul, textul și HTML-ul.
// Mailurile se construiesc cu tabele și stiluri scrise direct pe elemente,
// pentru că Gmail, Outlook și Yahoo ignoră o mare parte din CSS-ul modern.

const OLIVE = "#5a6b2e"; // aceeași culoare ca pe site
const OLIVE_LIGHT = "#f4f5ec";
const MUTED = "#6b7280";

// Eticheta cerută de lege pentru butonul de retragere (OUG 34/2014, modificată de OUG 18/2026)
const WITHDRAW_LABEL = "Retrageți-vă din contract aici";

// Ce a scris clientul (nume, adresă, notă) nu ajunge niciodată „crud” în HTML
function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

// „1 noiembrie 2026, ora 13:45”, în ora României
function dateTime(iso) {
    const date = new Date(iso);
    const day = date.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Bucharest",
    });
    const time = date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });
    return `${day}, ora ${time}`;
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

// Antetul, ca pe site: sigla și numele „Panos Greco” scris cu literele din logo.
// Imaginile sunt PNG, pentru că Gmail și Outlook nu afișează SVG. Vin de pe site (web/public/email).
// Dacă programul de mail blochează imaginile, rămâne textul alternativ, alb pe verde.
function header(siteUrl) {
    const site = esc(siteUrl);
    const img = "display:block;border:0;outline:none;text-decoration:none";
    // Sigla „atârnă” de marginea de sus, ca în bara site-ului
    return `<tr><td style="background:${OLIVE};padding:0 28px 14px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:14px"><a href="${site}"><img src="${site}/email/logo.png" width="77" height="64" alt="" style="${img}"></a></td>
<td style="vertical-align:middle"><a href="${site}" style="color:#ffffff;text-decoration:none"><img src="${site}/email/logo-text.png" width="128" height="26" alt="Panos Greco" style="${img};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;font-weight:bold"></a></td>
</tr></table>
</td></tr>`;
}

function layout(preheader, body, config) {
    return `<!doctype html>
<html lang="ro">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:${OLIVE_LIGHT};font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${OLIVE_LIGHT};padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
${header(config.siteUrl)}
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

// Dreptul de retragere, amintit în mailul de confirmare și în cel de livrare.
// Linkul duce direct la formularul comenzii (id-ul lung, greu de ghicit, ca la confirmare).
function withdrawalLink(order, config) {
    return `${config.siteUrl}/retragere/${order.id}`;
}

function withdrawalNote(status, order, config) {
    if (status !== "new" && status !== "delivered") return "";
    const link = withdrawalLink(order, config);
    const intro =
        status === "new"
            ? "Te poți retrage din contract în 14 zile de la primirea produselor, fără să ne spui motivul:"
            : "Dacă te răzgândești, ai 14 zile de la primire ca să te retragi din contract, fără să ne spui motivul:";
    return `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:${MUTED}">${intro}
<a href="${esc(link)}" style="color:${OLIVE};font-weight:bold">${WITHDRAW_LABEL}</a>.
Detalii în <a href="${esc(config.siteUrl)}/termeni" style="color:${OLIVE}">Termeni și condiții</a>
și în <a href="${esc(config.siteUrl)}/retur" style="color:${OLIVE}">Politica de retur</a>.</p>`;
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
${button(link, `Vezi comanda #${order.order_number}`)}
${withdrawalNote(status, order, config)}`;

    const text = [
        `Bună, ${order.customer_name}!`,
        "",
        ...message.lines,
        "",
        showItems ? itemsText(order) : "",
        `Vezi comanda: ${link}`,
        status === "new" || status === "delivered"
            ? `\nTe poți retrage din contract în 14 zile de la primire, fără să ne spui motivul: ${withdrawalLink(order, config)}`
            : "",
    ].join("\n");

    return {
        from: config.from,
        to: order.email,
        replyTo: config.shopEmail, // răspunsurile clientului ajung la tine
        subject: message.subject,
        text,
        html: layout(message.subject, body, config),
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
        html: layout(`Comandă nouă de la ${order.customer_name}`, body, config),
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
// ---------- Mailurile contului: parolă uitată și confirmarea emailului ----------

// Linkul din mail duce la o pagină de pe site; tokenul e cheia de unică folosință
function accountMessage(purpose, firstName, link) {
    const hello = firstName ? `Bună, ${firstName}!` : "Bună!";

    if (purpose === "reset_password") {
        return {
            subject: "Alege o parolă nouă pentru contul Panos Greco",
            title: "Parolă nouă",
            lines: [
                hello,
                "Am primit o cerere pentru o parolă nouă la contul tău. Apasă butonul de mai jos și alege-o.",
                "Linkul e valabil o oră și merge o singură dată.",
                "Dacă nu tu ai cerut asta, ignoră mailul: parola ta rămâne aceeași.",
            ],
            button: "Alege parola nouă",
            link,
        };
    }
    if (purpose === "verify_email") {
        return {
            subject: "Confirmă adresa de email",
            title: "Bun venit la Panos Greco!",
            lines: [
                hello,
                "Mai e un singur pas: confirmă că aceasta e adresa ta de email.",
                "Comenzile pe care le-ai plasat fără cont, cu această adresă, apar apoi singure în contul tău.",
                "Linkul e valabil 48 de ore.",
            ],
            button: "Confirmă emailul",
            link,
        };
    }
    return null; // un fel de mail necunoscut: nu trimitem nimic
}

export function buildAccountEmail(row, config) {
    const page = row.purpose === "reset_password" ? "/cont/parola-noua" : "/cont/confirma-email";
    const link = `${config.siteUrl}${page}?token=${encodeURIComponent(row.token)}`;
    const message = accountMessage(row.purpose, row.first_name, link);
    if (!message) return null;

    // Linkul lung (tokenul are 64 de caractere) se poate rupe oriunde, ca să nu iasă din ecran pe telefon
    const body = `<h1 style="margin:0 0 12px;font-size:22px;color:${OLIVE}">${esc(message.title)}</h1>
${message.lines.map((line) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.5">${esc(line)}</p>`).join("")}
${button(message.link, message.button)}
<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${MUTED}">Dacă butonul nu merge, copiază linkul în browser:<br><span style="word-break:break-all">${esc(message.link)}</span></p>`;

    return {
        from: config.from,
        to: row.email,
        replyTo: config.shopEmail,
        subject: message.subject,
        text: [...message.lines, "", `${message.button}: ${message.link}`].join("\n"),
        html: layout(message.subject, body, config),
    };
}

// ---------- Retragerea din contract (migrația 024) ----------

// Ce urmează după cerere: aceleași reguli ca pe site și în Politica de retur
function withdrawalNextSteps(data) {
    const address = data.shop?.shop_address;
    const steps = [
        address
            ? `Trimite-ne produsele înapoi în cel mult 14 zile, la adresa: ${address}. Dacă nu ai primit încă coletul, îl poți refuza la livrare.`
            : "Trimite-ne produsele înapoi în cel mult 14 zile. Îți scriem în curând adresa pentru retur. Dacă nu ai primit încă coletul, îl poți refuza la livrare.",
        "Păstrează produsele sigilate: alimentele desfăcute nu mai pot fi returnate, din motive de igienă.",
        "Îți returnăm banii în cel mult 14 zile de la primirea cererii. Putem aștepta până primim produsele sau dovada că le-ai trimis.",
    ];
    if (data.order.paid_on_delivery) {
        steps.push(
            data.has_iban
                ? "Banii îi trimitem în contul IBAN pe care ni l-ai dat."
                : "Ai plătit la livrare: răspunde la acest mail cu IBAN-ul în care vrei să primești banii.",
        );
    }
    steps.push("Costul transportului pentru retur e al tău.");
    return steps;
}

function withdrawalItemsList(data) {
    return data.items
        .map(
            (item) =>
                `<li style="margin:0 0 4px">${esc(item.quantity)} × ${esc(item.product_name)} <span style="color:${MUTED}">(${esc(item.size_label)})</span></li>`,
        )
        .join("");
}

// Confirmarea de primire pentru client: legea cere conținutul declarației, data și ora trimiterii
function customerWithdrawalEmail(data, config) {
    const n = data.order.order_number;
    const when = dateTime(data.created_at);
    const hello = data.order.first_name ? `Bună, ${data.order.first_name}!` : "Bună!";
    const steps = withdrawalNextSteps(data);
    const link = withdrawalLink(data.order, config);

    const body = `<h1 style="margin:0 0 12px;font-size:22px;color:${OLIVE}">Am primit cererea ta de retragere</h1>
<p style="margin:0 0 8px;font-size:15px">${esc(hello)}</p>
<p style="margin:0 0 8px;font-size:15px;line-height:1.5">Îți confirmăm că am primit cererea ta de retragere din contract pentru comanda <strong>#${esc(n)}</strong>, trimisă pe <strong>${esc(when)}</strong>.</p>
<p style="margin:16px 0 6px;font-size:14px;font-weight:bold">Declarația ta</p>
<p style="margin:0;padding:12px 14px;background:${OLIVE_LIGHT};border-left:4px solid ${OLIVE};font-size:14px;line-height:1.5">${esc(data.statement)}</p>
<p style="margin:16px 0 6px;font-size:14px;font-weight:bold">Produsele</p>
<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.5">${withdrawalItemsList(data)}</ul>
<p style="margin:16px 0 6px;font-size:14px;font-weight:bold">Ce urmează</p>
<ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.5">${steps.map((step) => `<li style="margin:0 0 6px">${esc(step)}</li>`).join("")}</ol>
${button(link, "Vezi cererea pe site")}`;

    const text = [
        hello,
        "",
        `Îți confirmăm că am primit cererea ta de retragere din contract pentru comanda #${n}, trimisă pe ${when}.`,
        "",
        "Declarația ta:",
        data.statement,
        "",
        "Ce urmează:",
        ...steps.map((step, index) => `${index + 1}. ${step}`),
        "",
        `Vezi cererea pe site: ${link}`,
    ].join("\n");

    return {
        from: config.from,
        to: data.email,
        replyTo: config.shopEmail,
        subject: `Am primit cererea ta de retragere · comanda #${n}`,
        text,
        html: layout(`Confirmarea cererii de retragere, trimisă pe ${when}`, body, config),
    };
}

// Notificarea pentru tine. IBAN-ul nu pleacă pe mail: îl vezi doar în admin.
function shopWithdrawalEmail(data, config) {
    const n = data.order.order_number;
    const when = dateTime(data.created_at);
    const link = `${config.siteUrl}/admin/comenzi/${n}`;
    const reason = data.reason
        ? `<p style="margin:16px 0 0;padding:12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;font-size:14px"><strong>Motivul clientului:</strong> ${esc(data.reason)}</p>`
        : "";
    const iban = data.has_iban
        ? `<p style="margin:12px 0 0;font-size:14px">A trimis și IBAN-ul pentru rambursare: îl găsești în admin.</p>`
        : "";

    const body = `<h1 style="margin:0 0 12px;font-size:22px;color:${OLIVE}">Cerere de retragere · comanda #${esc(n)}</h1>
<p style="margin:0;font-size:15px;line-height:1.6"><strong>${esc(data.customer_name)}</strong> · ${esc(data.email)}<br>Trimisă pe ${esc(when)}</p>
${reason}
<p style="margin:16px 0 6px;font-size:14px;font-weight:bold">Produsele returnate</p>
<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.5">${withdrawalItemsList(data)}</ul>
${iban}
<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:${MUTED}">${esc(data.statement)}</p>
${button(link, "Deschide comanda în admin")}`;

    const text = [
        `Cerere de retragere · comanda #${n}`,
        `${data.customer_name}, ${data.email}`,
        `Trimisă pe ${when}`,
        data.reason ? `Motivul clientului: ${data.reason}` : "",
        "",
        ...data.items.map((item) => `${item.quantity} × ${item.product_name} (${item.size_label})`),
        "",
        `Deschide în admin: ${link}`,
    ].join("\n");

    return {
        from: config.from,
        to: config.shopEmail,
        replyTo: data.email, // apeși „Răspunde” și îi scrii direct clientului
        subject: `Cerere de retragere · comanda #${n}`,
        text,
        html: layout(`Cerere de retragere de la ${data.customer_name}`, body, config),
    };
}

// Mailul pentru tine pleacă primul, ca la comenzi: dacă trebuie reîncercat,
// doar tu ai putea primi ceva de două ori, niciodată clientul
export function buildWithdrawalEmails(data, config) {
    return [shopWithdrawalEmail(data, config), customerWithdrawalEmail(data, config)];
}
