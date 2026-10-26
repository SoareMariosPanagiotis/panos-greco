// "Dulcețuri și marmelade" → "dulceturi-si-marmelade"
export function slugify(text: string) {
    return text
        .normalize("NFD") // desparte literele de semne: "ă" devine "a" + "˘"
        .replace(/[\u0300-\u036f]/g, "") // scoate semnele (diacriticele)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // orice nu e literă sau cifră devine "-"
        .replace(/^-+|-+$/g, ""); // fără "-" la început sau la sfârșit
}