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
  // La home reindirizza alla dashboard. Senza questa regola lo fa React con un
  // meta refresh a 1 secondo: un redirect "morbido" che risponde 200 (Google lo
  // tratta come pagina vuota) e che mostra un lampo di interfaccia prima di
  // cambiare pagina. Qui il redirect e' HTTP, immediato e senza rendering.
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
  outputFileTracingRoot: projectRoot,
  // In Next 15 la chiave e' passata da `experimental` a top-level: con il vecchio
  // nome Next la ignorava (e avvisava a ogni avvio).
  experimental: {
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
  // Non usiamo next/image per immagini remote: lasciare il optimizer aperto a
  // qualunque host e' un SSRF verso la rete interna. Se in futuro servira',
  // elencare qui SOLO gli host fidati (mai "**").
  images: {
    remotePatterns: [],
    dangerouslyAllowSVG: false,
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "frame-ancestors 'self'",
          "object-src 'none'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https://fonts.gstatic.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          // Next.js idrata le pagine con script inline: senza 'unsafe-inline'
          // l'app non parte. La difesa contro l'HTML generato dall'AI e' il
          // sandbox dell'iframe nella pagina demo, non questo valore.
          "script-src 'self' 'unsafe-inline'",
          "connect-src 'self' https:",
          "frame-src 'self' https://www.google.com https://maps.google.com",
          "form-action 'self' https://formsubmit.co",
        ].join("; "),
      },
    ];
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
