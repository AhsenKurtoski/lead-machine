// Sostituzione variabili nei template + costruzione link wa.me / mailto.
// Funzioni pure, usabili sia lato server che lato client.

export type LeadLike = {
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  city?: string | null;
  addressFull?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

export const TEMPLATE_VARIABLES = [
  "[nome]",
  "[categoria]",
  "[citta]",
  "[indirizzo]",
  "[io_nome]",
  "[io_attivita]",
  "[io_telefono]",
];

export function fillTemplate(
  text: string,
  lead: LeadLike,
  settings: Record<string, string>
): string {
  const map: Record<string, string> = {
    "[nome]": lead.name ?? "",
    "[categoria]": lead.subcategory ?? lead.category ?? "",
    "[citta]": lead.city ?? "",
    "[indirizzo]": lead.addressFull ?? "",
    "[io_nome]": settings.brand_owner ?? "",
    "[io_attivita]": settings.brand_name ?? "",
    "[io_telefono]": settings.brand_phone ?? "",
  };
  let out = text ?? "";
  for (const key of Object.keys(map)) {
    out = out.split(key).join(map[key]);
  }
  return out;
}

export function buildWaLink(
  whatsapp: string | null | undefined,
  body: string
): string | null {
  if (!whatsapp) return null;
  const num = whatsapp.replace(/[^0-9]/g, "");
  if (!num) return null;
  return "https://wa.me/" + num + "?text=" + encodeURIComponent(body);
}

export function buildMailto(
  email: string | null | undefined,
  subject: string,
  body: string
): string | null {
  if (!email) return null;
  return (
    "mailto:" +
    email +
    "?subject=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body)
  );
}
