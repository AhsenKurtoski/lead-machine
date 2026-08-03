import { prisma } from "@/lib/prisma";

// Legge tutte le impostazioni (branding ecc.) come mappa chiave->valore.
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}
