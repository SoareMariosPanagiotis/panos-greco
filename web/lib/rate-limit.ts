import { headers } from "next/headers";

// Frână pentru formularele publice: de câte ori are voie un vizitator (o adresă IP) să trimită
// un formular într-un interval. Împiedică ghicirea parolelor și a comenzilor, mailurile trimise
// în serie și cererile prea dese către ANAF.
//
// Numărătoarea stă în memoria serverului: se golește la repornire (dacă te blochezi singur cât
// testezi, repornește npm run dev) și merge cât timp avem un singur server, cum e cazul nostru.
// Cu mai multe servere, ar trebui mutată într-un loc comun (baza de date sau Redis).

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const RULES = {
    checkEmail: { limit: 30, window: 10 * MINUTE }, // „Intră în cont”, pasul cu emailul
    login: { limit: 10, window: 10 * MINUTE }, // în plus, baza de date blochează contul după 5 parole greșite
    register: { limit: 5, window: HOUR },
    passwordReset: { limit: 5, window: HOUR }, // fiecare cerere trimite un mail
    verificationEmail: { limit: 5, window: HOUR }, // la fel
    changePassword: { limit: 10, window: 10 * MINUTE },
    findOrder: { limit: 10, window: 10 * MINUTE }, // comanda după număr și email, la retur
    returnRequest: { limit: 10, window: HOUR },
    companyLookup: { limit: 20, window: 10 * MINUTE }, // ANAF primește cel mult o cerere pe secundă
    placeOrder: { limit: 10, window: HOUR },
    invoicePdf: { limit: 60, window: 10 * MINUTE }, // descărcarea facturilor în PDF (adminul descarcă și el)
    cancelOrder: { limit: 10, window: 10 * MINUTE }, // butonul „Anulează comanda” al clientului
} satisfies Record<string, { limit: number; window: number }>;

export type LimitedAction = keyof typeof RULES;

// Pentru fiecare formular și adresă IP: momentele încercărilor din ultimul interval.
// Ținută pe globalThis, ca să fie una singură pe tot serverul.
type Store = { hits: Map<string, number[]>; sweptAt: number };
const shared = globalThis as typeof globalThis & { panosRateLimit?: Store };
const store = (shared.panosRateLimit ??= { hits: new Map(), sweptAt: 0 });
const MAX_KEYS = 50_000; // plafon de memorie, pentru un val de cereri de pe foarte multe adrese

// Adresa vizitatorului. Pe server, în fața aplicației stă un proxy (nginx sau Caddy, pentru HTTPS),
// care adaugă adresa reală la sfârșitul lui X-Forwarded-For. Ce e înaintea ei poate scrie oricine,
// așa că luăm ultima. Local, Next.js pune acolo adresa calculatorului tău.
async function clientIp() {
    const forwarded = (await headers()).get("x-forwarded-for") ?? "";
    return (
        forwarded
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
            .at(-1) ?? "necunoscut"
    );
}

// O dată pe minut, uităm vizitatorii care n-au mai trimis nimic de o oră
function sweep(now: number) {
    if (now - store.sweptAt < MINUTE) return;
    store.sweptAt = now;
    for (const [key, times] of store.hits) {
        if (times[times.length - 1] <= now - HOUR) store.hits.delete(key);
    }
}

function inMinutes(minutes: number) {
    if (minutes >= 60) return "o oră";
    if (minutes === 1) return "un minut";
    return minutes < 20 ? `${minutes} minute` : `${minutes} de minute`;
}

// Numără o încercare. Întoarce null dacă are voie, altfel mesajul pentru client.
export async function rateLimit(action: LimitedAction): Promise<string | null> {
    const { limit, window } = RULES[action];
    const now = Date.now();
    sweep(now);

    const key = `${action}:${await clientIp()}`;
    const previous: number[] = store.hits.get(key) ?? [];
    const recent = previous.filter((time) => time > now - window);

    if (recent.length >= limit) {
        // Încercarea refuzată nu se mai numără: frâna ține până iese din interval cea mai veche
        store.hits.set(key, recent);
        const wait = Math.max(1, Math.ceil((recent[0] + window - now) / MINUTE));
        return `Prea multe încercări într-un timp scurt. Încearcă din nou peste ${inMinutes(wait)}.`;
    }

    recent.push(now);
    store.hits.delete(key); // o punem la coadă: cheile de la începutul listei sunt cele mai vechi
    store.hits.set(key, recent);
    for (const oldest of store.hits.keys()) {
        if (store.hits.size <= MAX_KEYS) break;
        store.hits.delete(oldest);
    }
    return null;
}
