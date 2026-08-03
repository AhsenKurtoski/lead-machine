// ============================================================
// Categorie di attivita -> selettori OpenStreetMap (Overpass)
// Ogni categoria puo mappare piu tag OSM (key=value).
// ============================================================

export type Category = {
  id: string;
  label: string;
  group: string;
  selectors: [string, string][]; // [ ["amenity","restaurant"], ... ]
};

export const CATEGORIES: Category[] = [
  // --- Ricettivita ---
  { id: "hotel", label: "Hotel", group: "Ricettivita", selectors: [["tourism", "hotel"]] },
  { id: "bnb", label: "B&B / Affittacamere", group: "Ricettivita", selectors: [["tourism", "guest_house"], ["tourism", "apartment"]] },
  { id: "agriturismo", label: "Agriturismo", group: "Ricettivita", selectors: [["tourism", "chalet"], ["tourism", "farm"]] },

  // --- Ristorazione ---
  { id: "ristorante", label: "Ristorante", group: "Ristorazione", selectors: [["amenity", "restaurant"]] },
  { id: "pizzeria", label: "Pizzeria / Fast food", group: "Ristorazione", selectors: [["amenity", "fast_food"]] },
  { id: "bar", label: "Bar / Caffe / Pub", group: "Ristorazione", selectors: [["amenity", "bar"], ["amenity", "cafe"], ["amenity", "pub"]] },
  { id: "pasticceria", label: "Pasticceria", group: "Ristorazione", selectors: [["shop", "pastry"], ["shop", "confectionery"]] },
  { id: "gelateria", label: "Gelateria", group: "Ristorazione", selectors: [["amenity", "ice_cream"], ["shop", "ice_cream"]] },
  { id: "enoteca", label: "Enoteca", group: "Ristorazione", selectors: [["shop", "wine"]] },

  // --- Bellezza & benessere ---
  { id: "parrucchiere", label: "Parrucchiere / Barbiere", group: "Bellezza", selectors: [["shop", "hairdresser"]] },
  { id: "estetista", label: "Estetista", group: "Bellezza", selectors: [["shop", "beauty"]] },
  { id: "spa", label: "Centro benessere / Spa", group: "Bellezza", selectors: [["leisure", "spa"]] },
  { id: "palestra", label: "Palestra", group: "Bellezza", selectors: [["leisure", "fitness_centre"], ["leisure", "sports_centre"]] },

  // --- Artigiani ---
  { id: "idraulico", label: "Idraulico", group: "Artigiani", selectors: [["craft", "plumber"]] },
  { id: "elettricista", label: "Elettricista", group: "Artigiani", selectors: [["craft", "electrician"]] },
  { id: "falegname", label: "Falegname", group: "Artigiani", selectors: [["craft", "carpenter"]] },
  { id: "edile", label: "Edile / Costruzioni", group: "Artigiani", selectors: [["craft", "builder"], ["office", "construction_company"]] },
  { id: "fotografo", label: "Fotografo", group: "Artigiani", selectors: [["craft", "photographer"], ["shop", "photo"]] },

  // --- Negozi & botteghe ---
  { id: "panetteria", label: "Panetteria", group: "Negozi", selectors: [["shop", "bakery"]] },
  { id: "macelleria", label: "Macelleria", group: "Negozi", selectors: [["shop", "butcher"]] },
  { id: "abbigliamento", label: "Abbigliamento", group: "Negozi", selectors: [["shop", "clothes"], ["shop", "shoes"]] },
  { id: "fiorista", label: "Fiorista", group: "Negozi", selectors: [["shop", "florist"]] },
  { id: "gioielleria", label: "Gioielleria", group: "Negozi", selectors: [["shop", "jewelry"]] },
  { id: "animali", label: "Toelettatura / Pet", group: "Negozi", selectors: [["shop", "pet_grooming"], ["shop", "pet"]] },

  // --- Studi professionali ---
  { id: "dentista", label: "Dentista", group: "Professionisti", selectors: [["amenity", "dentist"], ["healthcare", "dentist"]] },
  { id: "fisioterapista", label: "Fisioterapista", group: "Professionisti", selectors: [["healthcare", "physiotherapist"]] },
  { id: "avvocato", label: "Avvocato", group: "Professionisti", selectors: [["office", "lawyer"]] },
  { id: "commercialista", label: "Commercialista", group: "Professionisti", selectors: [["office", "accountant"], ["office", "tax_advisor"]] },
  { id: "immobiliare", label: "Agenzia immobiliare", group: "Professionisti", selectors: [["office", "estate_agent"]] },

  // --- Auto & corsi ---
  { id: "autofficina", label: "Autofficina", group: "Auto & Corsi", selectors: [["shop", "car_repair"]] },
  { id: "autolavaggio", label: "Autolavaggio", group: "Auto & Corsi", selectors: [["amenity", "car_wash"]] },
  { id: "autoscuola", label: "Autoscuola", group: "Auto & Corsi", selectors: [["amenity", "driving_school"]] },
];

export const CATEGORY_GROUPS = Array.from(new Set(CATEGORIES.map((c) => c.group)));

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
