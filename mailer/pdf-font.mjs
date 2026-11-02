// Fonturile pentru facturile PDF.
//
// Fonturile standard din PDF (Helvetica & co.) nu au literele ș, ț, ă, așa că punem în PDF
// un font TrueType al nostru (fonts/). pdf-lib știe să-l pună în fișier, dar are nevoie de
// cineva care să-l citească: de obicei biblioteca fontkit. Ne trebuie doar o mică parte din ea,
// așa că o scriem aici: citim din fișierul fontului ce literă e la ce desen (glyph) și cât de lat
// e fiecare desen. Fără despărțiri în silabe, ligaturi sau kerning: la o factură nu ne trebuie.
//
// Un fișier TrueType e o listă de tabele, fiecare cu un nume de 4 litere:
//   head  dimensiunile generale        hhea/hmtx  lățimea fiecărui desen
//   cmap  literă → numărul desenului    name       numele fontului
//   post, OS/2  date pentru descrierea fontului din PDF

class Reader {
    constructor(bytes) {
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }
    u16(offset) {
        return this.view.getUint16(offset);
    }
    i16(offset) {
        return this.view.getInt16(offset);
    }
    u32(offset) {
        return this.view.getUint32(offset);
    }
    i32(offset) {
        return this.view.getInt32(offset);
    }
    tag(offset) {
        return String.fromCharCode(...[0, 1, 2, 3].map((i) => this.view.getUint8(offset + i)));
    }
}

function readTables(reader) {
    const version = reader.u32(0);
    if (version !== 0x00010000 && reader.tag(0) !== "true") {
        throw new Error("Fontul trebuie să fie TrueType (.ttf).");
    }
    const tables = {};
    const count = reader.u16(4);
    for (let i = 0; i < count; i++) {
        const record = 12 + i * 16;
        tables[reader.tag(record)] = { offset: reader.u32(record + 8), length: reader.u32(record + 12) };
    }
    for (const name of ["head", "hhea", "hmtx", "maxp", "cmap"]) {
        if (!tables[name]) throw new Error(`Fontul nu are tabelul ${name}.`);
    }
    return tables;
}

// cmap: din codul Unicode al literei, numărul desenului. Formatul 12 (tot Unicode) sau 4 (doar BMP).
function readCmap(reader, cmap) {
    const map = new Map();
    const count = reader.u16(cmap + 2);
    let format4 = null;
    let format12 = null;
    for (let i = 0; i < count; i++) {
        const record = cmap + 4 + i * 8;
        const platform = reader.u16(record);
        const encoding = reader.u16(record + 2);
        const subtable = cmap + reader.u32(record + 4);
        const format = reader.u16(subtable);
        const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
        if (!unicode) continue;
        if (format === 12) format12 = subtable;
        if (format === 4) format4 = subtable;
    }

    if (format12 !== null) {
        const groups = reader.u32(format12 + 12);
        for (let g = 0; g < groups; g++) {
            const group = format12 + 16 + g * 12;
            const start = reader.u32(group);
            const end = reader.u32(group + 4);
            const glyph = reader.u32(group + 8);
            for (let code = start; code <= end; code++) map.set(code, glyph + (code - start));
        }
        return map;
    }
    if (format4 === null) throw new Error("Fontul nu are o tabelă cmap Unicode.");

    const segments = reader.u16(format4 + 6) / 2;
    const ends = format4 + 14;
    const starts = ends + segments * 2 + 2;
    const deltas = starts + segments * 2;
    const rangeOffsets = deltas + segments * 2;
    for (let s = 0; s < segments; s++) {
        const start = reader.u16(starts + s * 2);
        const end = reader.u16(ends + s * 2);
        const delta = reader.i16(deltas + s * 2);
        const rangeOffsetAt = rangeOffsets + s * 2;
        const rangeOffset = reader.u16(rangeOffsetAt);
        for (let code = start; code <= end && code !== 0xffff; code++) {
            let glyph;
            if (rangeOffset === 0) {
                glyph = (code + delta) & 0xffff;
            } else {
                const at = rangeOffsetAt + rangeOffset + (code - start) * 2;
                glyph = reader.u16(at);
                if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
            }
            if (glyph !== 0) map.set(code, glyph);
        }
    }
    return map;
}

// name: numele PostScript al fontului (id 6), în varianta Windows (UTF-16) sau Mac (ASCII)
function readPostscriptName(reader, name) {
    if (!name) return "Font";
    const count = reader.u16(name.offset + 2);
    const strings = name.offset + reader.u16(name.offset + 4);
    for (let i = 0; i < count; i++) {
        const record = name.offset + 6 + i * 12;
        if (reader.u16(record + 6) !== 6) continue;
        const platform = reader.u16(record);
        const length = reader.u16(record + 8);
        const start = strings + reader.u16(record + 10);
        let text = "";
        if (platform === 3 || platform === 0) {
            for (let k = 0; k < length; k += 2) text += String.fromCharCode(reader.u16(start + k));
        } else {
            for (let k = 0; k < length; k++) text += String.fromCharCode(reader.view.getUint8(start + k));
        }
        if (text) return text.replace(/[^A-Za-z0-9-]/g, "");
    }
    return "Font";
}

class TrueTypeFont {
    constructor(bytes) {
        const reader = new Reader(bytes);
        const tables = readTables(reader);
        const head = tables.head.offset;
        const hhea = tables.hhea.offset;

        this.unitsPerEm = reader.u16(head + 18);
        this.bbox = {
            minX: reader.i16(head + 36),
            minY: reader.i16(head + 38),
            maxX: reader.i16(head + 40),
            maxY: reader.i16(head + 42),
        };
        this.head = { macStyle: { italic: (reader.u16(head + 44) & 2) !== 0 } };
        this.ascent = reader.i16(hhea + 4);
        this.descent = reader.i16(hhea + 6);

        const post = tables.post?.offset;
        this.italicAngle = post === undefined ? 0 : reader.i32(post + 4) / 65536;
        this.post = { isFixedPitch: post === undefined ? false : reader.u32(post + 12) !== 0 };

        const os2 = tables["OS/2"]?.offset;
        this["OS/2"] = { sFamilyClass: os2 === undefined ? 0 : reader.i16(os2 + 30) };
        const os2Version = os2 === undefined ? 0 : reader.u16(os2);
        this.xHeight = os2Version >= 2 ? reader.i16(os2 + 86) : 0;
        this.capHeight = os2Version >= 2 ? reader.i16(os2 + 88) : this.ascent;

        this.postscriptName = readPostscriptName(reader, tables.name);
        this.cff = false; // TrueType, nu CFF

        // Lățimile: primele numberOfHMetrics desene au lățimea lor; restul o repetă pe ultima
        const glyphCount = reader.u16(tables.maxp.offset + 4);
        const metrics = reader.u16(hhea + 34);
        this.widths = new Uint16Array(glyphCount);
        for (let id = 0; id < glyphCount; id++) {
            const index = Math.min(id, metrics - 1);
            this.widths[id] = reader.u16(tables.hmtx.offset + index * 4);
        }

        this.cmap = readCmap(reader, tables.cmap.offset);
        this.characterSet = [...this.cmap.keys()].sort((a, b) => a - b);

        // Pentru fiecare desen, literele care îl folosesc (pdf-lib face din ele harta ToUnicode,
        // ca textul din PDF să se poată căuta și copia)
        this.codePointsByGlyph = new Map();
        for (const [code, id] of this.cmap) {
            const list = this.codePointsByGlyph.get(id);
            if (list) list.push(code);
            else this.codePointsByGlyph.set(id, [code]);
        }
    }

    glyphForCodePoint(code) {
        const id = this.cmap.get(code) ?? 0; // 0 = desenul „lipsă”
        return {
            id,
            advanceWidth: this.widths[id] ?? 0,
            codePoints: this.codePointsByGlyph.get(id)?.slice(0, 1) ?? [code],
        };
    }

    // O literă = un desen, de la stânga la dreapta
    layout(text) {
        return { glyphs: [...String(text)].map((char) => this.glyphForCodePoint(char.codePointAt(0))) };
    }

    hasGlyph(char) {
        return this.cmap.has(char.codePointAt(0));
    }
}

// Ce așteaptă pdf-lib de la fontkit: create(bytes) → font
export const trueTypeFontkit = {
    create(bytes) {
        return new TrueTypeFont(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    },
};
