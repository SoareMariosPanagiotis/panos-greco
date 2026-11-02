// Returul în 14 zile = „retragerea din contract” din lege (OUG 34/2014, modificată de OUG 18/2026).
// Legea cere ca butonul să spună „retrageți-vă din contract aici” SAU o formulare similară,
// fără ambiguitate. Clienții caută „retur”, așa că folosim „retur”, cum fac eMAG („Formular
// returnare produs”) și platformele de magazine (MerchantPro recomandă „Formular de retur”).
// Pe pagini explicăm o dată că returul înseamnă retragerea din contract.
export const RETURN_FORM_LABEL = "Formular de retur"; // linkul din subsol și din mailuri
export const RETURN_BUTTON_LABEL = "Returnează produse"; // butonul de la fiecare comandă
export const CONFIRM_LABEL = "Confirmă returul"; // butonul final (legea: „confirmați retragerea” sau similar)
export const RETURN_FORM_PATH = "/retur/formular";

export const WITHDRAWAL_STATUSES = ["received", "goods_received", "refunded", "closed"] as const;
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
    received: "Primită",
    goods_received: "Produse primite înapoi",
    refunded: "Bani returnați",
    closed: "Încheiată",
};

// Galben = te așteaptă pe tine, verde = gata
export const WITHDRAWAL_STATUS_STYLES: Record<string, string> = {
    received: "bg-amber-100 text-amber-800",
    goods_received: "bg-sky-100 text-sky-800",
    refunded: "bg-green-100 text-green-800",
    closed: "bg-neutral-200 text-neutral-600",
};

export function withdrawalStatusLabel(status: string) {
    return WITHDRAWAL_STATUS_LABELS[status] ?? status;
}

// Ce primește pagina de retragere de la funcția sales.withdrawal_form
export type WithdrawalRequestSummary = { createdAt: string; status: string };

export type WithdrawalFormItem = {
    id: string;
    productName: string;
    sizeLabel: string;
    quantity: number;
    remaining: number; // câte bucăți mai pot fi returnate
};

export type WithdrawalFormData =
    | {
          canWithdraw: true;
          canCancel: boolean; // n-a plecat încă: se poate anula direct (migrația 031)
          orderId: string;
          orderNumber: number;
          status: string;
          createdAt: string;
          deadline: string | null; // null = comanda nu e livrată încă
          customerName: string;
          email: string;
          paidOnDelivery: boolean;
          items: WithdrawalFormItem[];
          requests: WithdrawalRequestSummary[];
      }
    | {
          canWithdraw: false;
          orderNumber: number;
          reason: "cancelled" | "expired" | "complete";
          deadline: string | null;
          requests: WithdrawalRequestSummary[];
      };

// PostGraphile trimite câmpurile JSON ca text: le transformăm înapoi în obiecte
export function parseJson<T>(value: unknown): T | null {
    if (value === null || value === undefined) return null;
    if (typeof value !== "string") return value as T;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

// Termenul, așa cum îl citește clientul: „16 noiembrie 2026”.
// Baza de date trimite începutul zilei următoare (ora 00:00), deci ultima zi e cu o secundă înainte.
export function formatDeadline(iso: string) {
    return new Date(new Date(iso).getTime() - 1000).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Bucharest",
    });
}

// Data și ora exacte ale cererii, pentru confirmare: „1 noiembrie 2026, ora 13:45”
export function formatRequestTime(iso: string) {
    const date = new Date(iso);
    const day = date.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Bucharest",
    });
    const time = date.toLocaleTimeString("ro-RO", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Bucharest",
    });
    return `${day}, ora ${time}`;
}

// IBAN: fără spații, cu majuscule. „ro49 aaaa 1b31…” → „RO49AAAA1B31…”
export function normalizeIban(value: string) {
    return value.replace(/\s+/g, "").toUpperCase();
}

// Cifra de control a IBAN-ului (aceeași regulă ca în baza de date):
// primele 4 caractere merg la coadă, literele devin numere (A = 10 ... Z = 35),
// iar restul împărțirii la 97 trebuie să fie 1
export function isValidIban(iban: string) {
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
    const moved = iban.slice(4) + iban.slice(0, 4);
    let rest = 0;
    for (const char of moved) {
        const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
        for (const digit of digits) {
            rest = (rest * 10 + Number(digit)) % 97;
        }
    }
    return rest === 1;
}

// Pentru afișare: grupuri de câte 4 caractere
export function formatIban(iban: string) {
    return iban.replace(/(.{4})/g, "$1 ").trim();
}
