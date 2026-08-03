// Centri abitati principali della provincia di Belluno (BL) con coordinate.
// Servono per estendere la ricerca lead oltre Feltre, a tutta la provincia,
// usando piu centri di ricerca su OpenStreetMap (gratis, senza carta).

export type Comune = { name: string; lat: number; lng: number };

export const FELTRE_CENTER: Comune = { name: "Feltre", lat: 46.0172, lng: 11.91 };

// Lista curata dei comuni piu popolosi/strategici della provincia di Belluno.
export const BELLUNO_COMUNI: Comune[] = [
  { name: "Belluno", lat: 46.1428, lng: 12.2156 },
  { name: "Feltre", lat: 46.0172, lng: 11.91 },
  { name: "Sedico", lat: 46.1167, lng: 12.0972 },
  { name: "Santa Giustina", lat: 46.0686, lng: 12.0386 },
  { name: "Mel (Borgo Valbelluna)", lat: 46.0667, lng: 12.0833 },
  { name: "Ponte nelle Alpi", lat: 46.1833, lng: 12.2833 },
  { name: "Longarone", lat: 46.2667, lng: 12.3 },
  { name: "Pieve di Cadore", lat: 46.4281, lng: 12.3739 },
  { name: "Cortina d'Ampezzo", lat: 46.5405, lng: 12.1357 },
  { name: "Agordo", lat: 46.2833, lng: 12.0333 },
  { name: "Fonzaso", lat: 46.0156, lng: 11.8014 },
  { name: "Lamon", lat: 46.0289, lng: 11.7639 },
  { name: "Auronzo di Cadore", lat: 46.5528, lng: 12.4333 },
  { name: "Lentiai", lat: 46.05, lng: 12.0 },
];

// Raggi disponibili (in metri) per la ricerca.
export const RADIUS_PRESETS: { value: number; label: string }[] = [
  { value: 5000, label: "5 km (citta)" },
  { value: 10000, label: "10 km" },
  { value: 20000, label: "20 km (comprensorio)" },
  { value: 35000, label: "35 km (zona ampia)" },
];
