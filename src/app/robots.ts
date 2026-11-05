import type { MetadataRoute } from "next";
import { buildRobotsRules, resolveSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: buildRobotsRules(),
    sitemap: resolveSiteUrl() + "/sitemap.xml",
  } as MetadataRoute.Robots;
}
