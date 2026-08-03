export type Lead = {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lon: number;
  phone?: string;
  website?: string;
  email?: string;
  hours?: string;
  score: number;
  distanceKm?: number;
};

export type SearchParams = {
  category: string;
  city: string;
  radiusKm: number;
};

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function sanitizeCategory(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function geocodeCity(
  city: string,
  lang = "en"
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const url = `${NOMINATIM_URL}?format=jsonv2&limit=1&accept-language=${encodeURIComponent(
    lang
  )}&q=${encodeURIComponent(city)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const first = data[0];
  if (!first) return null;
  return {
    lat: parseFloat(first.lat),
    lon: parseFloat(first.lon),
    displayName: first.display_name,
  };
}

type OverpassPlace = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function scoreLead(tags: Record<string, string> | undefined): number {
  if (!tags) return 10;
  let score = 10;
  if (tags.phone) score += 30;
  if (tags.website || tags["contact:website"]) score += 20;
  if (tags.email || tags["contact:email"]) score += 25;
  if (tags.opening_hours) score += 15;
  return Math.min(score, 100);
}

function buildAddress(tags: Record<string, string> | undefined): string {
  if (!tags) return "";
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.join(", ");
}

export async function searchLeads(
  params: SearchParams,
  lang = "en"
): Promise<Lead[]> {
  const category = sanitizeCategory(params.category);
  if (!category) throw new Error("empty_category");

  const geo = await geocodeCity(params.city, lang);
  if (!geo) throw new Error("geocode_failed");

  const radiusM = Math.round(Math.max(500, Math.min(params.radiusKm * 1000, 50000)));

  const query = `[out:json][timeout:25];(node["amenity"="${category}"](around:${radiusM},${geo.lat},${geo.lon});way["amenity"="${category}"](around:${radiusM},${geo.lat},${geo.lon});node["craft"="${category}"](around:${radiusM},${geo.lat},${geo.lon});way["craft"="${category}"](around:${radiusM},${geo.lat},${geo.lon});node["shop"="${category}"](around:${radiusM},${geo.lat},${geo.lon});way["shop"="${category}"](around:${radiusM},${geo.lat},${geo.lon}););out center 40;`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("overpass_failed");
    const data = (await res.json()) as { elements?: OverpassPlace[] };

    const leads: Lead[] = (data.elements ?? [])
      .filter((p) => p.tags && p.tags.name)
      .map((p) => {
        const tags = p.tags ?? {};
        const lat = p.lat ?? p.center?.lat ?? 0;
        const lon = p.lon ?? p.center?.lon ?? 0;
        return {
          id: `${p.type}-${p.id}`,
          name: tags.name,
          category: tags.amenity ?? tags.craft ?? tags.shop ?? category,
          address: buildAddress(tags),
          lat,
          lon,
          phone: tags.phone,
          website: tags.website ?? tags["contact:website"],
          email: tags.email ?? tags["contact:email"],
          hours: tags.opening_hours,
          score: scoreLead(tags),
          distanceKm: lat && lon ? haversineKm(geo.lat, geo.lon, lat, lon) : undefined,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return leads;
  } finally {
    clearTimeout(timer);
  }
}
