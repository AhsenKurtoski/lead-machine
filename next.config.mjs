import path from "node:path";
import { fileURLToPath } from "node:url";

// La root del workspace è fissata alla root del progetto: senza questo,
// Next può inferire una directory sbagliata se trova altri lockfile in giro.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  outputFileTracingRoot: projectRoot,
  experimental: {
    serverComponentsExternalPackages: ["playwright"],
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "clsx",
      "tailwind-merge",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
