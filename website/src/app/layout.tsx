import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
  ),
  title: {
    default: "Lead Machine — Open-Source Lead Generation CRM",
    template: "%s · Lead Machine",
  },
  description:
    "Free, open-source, self-hosted lead generation platform for freelancers & small agencies. Find nearby businesses, score them, contact them, build quotes. €0 forever.",
  applicationName: "Lead Machine",
  authors: [{ name: "Lead Machine Contributors" }],
  keywords: [
    "lead generation",
    "crm",
    "open source",
    "self hosted",
    "freelancer tools",
    "small business",
    "openstreetmap",
    "quotes",
    "invoicing",
    "byok",
    "privacy first",
  ],
  creator: "Lead Machine Contributors",
  publisher: "Lead Machine",
  category: "technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://leadmachine.dev",
    siteName: "Lead Machine",
    title: "Lead Machine — Open-Source Lead Generation CRM",
    description:
      "Free, open-source, self-hosted lead generation. €0 subscriptions. Your data. Your keys.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lead Machine — Free forever Lead Gen CRM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lead Machine — Free Open-Source CRM",
    description:
      "Find, score & contact 40M+ businesses. 100% open source. MIT license.",
    creator: "@leadmachine_dev",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en",
      "it-IT": "/it",
      "de-DE": "/de",
      "fr-FR": "/fr",
      "sl-SI": "/sl",
      "es-ES": "/es",
      "pt-PT": "/pt",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F19" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
