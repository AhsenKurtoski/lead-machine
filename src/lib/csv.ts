// ============================================================
// Helper CSV puri (export/import lead) - nessuna dipendenza esterna.
// Gestiscono virgolette, virgole e ritorni a capo dentro i campi.
// ============================================================

export function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const header = columns.join(",");
  const lines = rows.map((r) => columns.map((c) => esc(r[c])).join(","));
  return [header, ...lines].join("\n");
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    cur.push(field);
    field = "";
  };
  const pushRow = () => {
    rows.push(cur);
    cur = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushField();
      pushRow();
    } else if (ch === "\r") {
      // ignora
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    pushField();
    pushRow();
  }
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const out: Array<Record<string, string>> = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0] === "") continue; // riga vuota
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = (row[idx] ?? "").trim();
    });
    out.push(obj);
  }
  return out;
}

// Colonne usate per export/import dei lead (ordine stabile).
export const LEAD_CSV_COLUMNS: string[] = [
  "name",
  "category",
  "subcategory",
  "phone",
  "mobile",
  "whatsapp",
  "email",
  "hasWebsite",
  "website",
  "websiteStatus",
  "hasSocial",
  "instagram",
  "facebook",
  "tiktok",
  "googleRating",
  "googleReviews",
  "addressFull",
  "city",
  "postalCode",
  "lat",
  "lng",
  "priorityScore",
  "priorityReason",
  "status",
  "notes",
  "source",
];
