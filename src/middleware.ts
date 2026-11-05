import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  authConfigured,
  verifySessionToken,
} from "@/lib/auth";

// Rotte pubbliche: login/logout, health check e l'API pubblica con chiave.
// Tutto il resto richiede una sessione valida.
const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/logout", "/api/health"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // L'API v1 usa la propria autenticazione tramite API key.
  return pathname === "/api/v1" || pathname.startsWith("/api/v1/");
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.host !== host) return false;
    } catch {
      return false;
    }
  }
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Asset statici e file pubblici non sensibili.
  if (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");

  // Fail closed: senza APP_PASSWORD nessuna pagina o API protetta viene
  // servita, su qualunque host. Il solo header Host non e' un confine di
  // sicurezza: un client remoto puo' inviare "Host: localhost".
  if (!authConfigured()) {
    const message =
      "APP_PASSWORD non configurata. Imposta una password di almeno 8 caratteri nel file .env e riavvia l'app.";
    return isApi
      ? NextResponse.json({ ok: false, error: message }, { status: 503 })
      : new NextResponse(message, { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) {
    if (isApi) {
      return NextResponse.json(
        { ok: false, error: "Autenticazione richiesta. Effettua il login e riprova." },
        { status: 401 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/dashboard") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // CSRF: le mutazioni same-origin sono obbligatorie per le API con cookie.
  // L'API v1 e' esente perche' usa un bearer token, non un cookie di sessione.
  if (isApi && !["GET", "HEAD", "OPTIONS"].includes(req.method) && !sameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Richiesta cross-origin bloccata." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
