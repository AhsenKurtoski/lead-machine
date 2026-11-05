import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // Le rotte pubbliche stanno in src/lib/seo.ts: un test verifica che
  // ognuna abbia davvero la sua pagina nel repo.
  return buildSitemapEntries() as MetadataRoute.Sitemap;
}
