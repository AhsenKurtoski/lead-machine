import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext builds the Next.js app into a Cloudflare Worker.
// Caching is left to the defaults; the app stores its data in D1.
export default defineCloudflareConfig();
