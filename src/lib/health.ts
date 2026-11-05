// ============================================================
// Diagnostica locale della app.
//
// Questa pagina non e' un test di carico e non chiama servizi esterni:
// controlla cio' che puo' verificare in modo affidabile sul computer in cui
// gira l'app (file del progetto, database, configurazione, integrazioni).
// Nessun valore di chiave o password viene mai restituito alla UI.
// ============================================================

import {
  accessSync,
  constants,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";

import { getAiConfig } from "@/lib/ai";
import { authConfigured } from "@/lib/auth";
import { isRealContactEmail } from "@/lib/osm";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const ROOT = process.cwd();

export type HealthStatus = "ok" | "warn" | "fail" | "info";

export type HealthCheck = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  hint?: string;
};

export type HealthSection = {
  id: string;
  title: string;
  description?: string;
  checks: HealthCheck[];
};

export type HealthSummary = {
  ok: number;
  warn: number;
  fail: number;
  info: number;
};

export type HealthReport = {
  checkedAt: string;
  overall: Exclude<HealthStatus, "info">;
  summary: HealthSummary;
  sections: HealthSection[];
};

type PackageJson = {
  name?: string;
  version?: string;
  engines?: { node?: string };
  scripts?: Record<string, string>;
};

function check(
  id: string,
  label: string,
  status: HealthStatus,
  detail: string,
  hint?: string
): HealthCheck {
  return { id, label, status, detail, ...(hint ? { hint } : {}) };
}

function ok(id: string, label: string, detail: string, hint?: string): HealthCheck {
  return check(id, label, "ok", detail, hint);
}

function warn(id: string, label: string, detail: string, hint?: string): HealthCheck {
  return check(id, label, "warn", detail, hint);
}

function fail(id: string, label: string, detail: string, hint?: string): HealthCheck {
  return check(id, label, "fail", detail, hint);
}

function info(id: string, label: string, detail: string, hint?: string): HealthCheck {
  return check(id, label, "info", detail, hint);
}

function section(id: string, title: string, checks: HealthCheck[], description?: string): HealthSection {
  return { id, title, checks, ...(description ? { description } : {}) };
}

function readPackage(): PackageJson | null {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as PackageJson;
  } catch {
    return null;
  }
}

function readText(relativePath: string): string | null {
  try {
    return readFileSync(path.join(ROOT, relativePath), "utf8");
  } catch {
    return null;
  }
}

function walkFiles(dir: string, visit: (file: string) => void): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    if (entry.name === "tmp" || entry.name === "screenshots") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, visit);
    } else {
      visit(full);
    }
  }
}

function sourceStats(): {
  pages: number;
  routes: number;
  modules: number;
  components: number;
  tests: number;
} {
  const stats = { pages: 0, routes: 0, modules: 0, components: 0, tests: 0 };
  walkFiles(path.join(ROOT, "src"), (file) => {
    const base = path.basename(file);
    const normalized = file.split(path.sep).join("/");
    if (base === "page.tsx") stats.pages += 1;
    if (base === "route.ts") stats.routes += 1;
    if (normalized.includes("/lib/") && file.endsWith(".test.ts")) stats.tests += 1;
    else if (normalized.includes("/lib/") && file.endsWith(".ts")) stats.modules += 1;
    if (normalized.includes("/components/") && /\.(ts|tsx)$/.test(file)) stats.components += 1;
  });
  return stats;
}

function packageInstalled(name: string): boolean {
  return existsSync(path.join(ROOT, "node_modules", name, "package.json"));
}

function directoryWritable(relativePath: string): boolean {
  try {
    accessSync(path.join(ROOT, relativePath), constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function countFiles(relativeDir: string, extension: string): number {
  let count = 0;
  walkFiles(path.join(ROOT, relativeDir), (file) => {
    if (file.endsWith(extension)) count += 1;
  });
  return count;
}

/** Controlla un requisito semplice tipo `>=18.18.0` o `^20`. */
export function isNodeSupported(version: string, requirement: string): boolean {
  const actual = version.replace(/^v/, "").split(".").map((part) => Number(part));
  const match = /(\d+)(?:\.(\d+))?/.exec(requirement);
  if (!match) return true;
  const requiredMajor = Number(match[1]);
  const requiredMinor = Number(match[2] ?? 0);
  if (!Number.isFinite(actual[0]) || !Number.isFinite(actual[1])) return false;
  if (actual[0] !== requiredMajor) return actual[0] > requiredMajor;
  return actual[1] >= requiredMinor;
}

export function summarizeHealth(sections: HealthSection[]): {
  overall: Exclude<HealthStatus, "info">;
  summary: HealthSummary;
} {
  const summary: HealthSummary = { ok: 0, warn: 0, fail: 0, info: 0 };
  for (const section of sections) {
    for (const check of section.checks) summary[check.status] += 1;
  }
  return {
    overall: summary.fail > 0 ? "fail" : summary.warn > 0 ? "warn" : "ok",
    summary,
  };
}

function runtimeSection(pkg: PackageJson | null): HealthSection {
  const checks: HealthCheck[] = [];
  const nodeVersion = process.versions.node;
  const requiredNode = pkg?.engines?.node ?? ">=18.18.0";
  checks.push(
    isNodeSupported(nodeVersion, requiredNode)
      ? ok("runtime.node", "Node.js", `${nodeVersion} (richiesto ${requiredNode}).`)
      : fail(
          "runtime.node",
          "Node.js",
          `${nodeVersion} non soddisfa il requisito ${requiredNode}.`,
          "Aggiorna Node.js oppure usa la versione dichiarata in package.json."
        )
  );

  if (!pkg) {
    checks.push(
      warn(
        "runtime.package",
        "package.json",
        "Non leggibile dalla directory di lavoro.",
        "Avvia l'app dalla root del progetto o verifica i permessi."
      )
    );
  } else {
    checks.push(
      ok(
        "runtime.package",
        "Applicazione",
        `${pkg.name ?? "lead-machine"} ${pkg.version ?? ""}`.trim() + "."
      )
    );
  }

  const stats = sourceStats();
  if (stats.pages > 0 && stats.routes > 0) {
    checks.push(
      ok(
        "project.scan",
        "Scansione del progetto",
        `${stats.pages} pagine, ${stats.routes} route API, ${stats.modules} moduli in src/lib, ${stats.components} componenti.`
      )
    );
  } else {
    checks.push(
      warn(
        "project.scan",
        "Scansione del progetto",
        "Sorgenti non trovati o incompleti nella directory di lavoro.",
        "In un deployment standalone i sorgenti possono non essere inclusi: il controllo è informativo."
      )
    );
  }

  checks.push(
    stats.tests > 0
      ? ok("project.tests", "Test unitari", `${stats.tests} file di test in src/lib.`, "Esegui `npm test` per la suite completa.")
      : warn("project.tests", "Test unitari", "Nessun file di test trovato.", "Esegui `npm test` dopo aver aggiunto i test.")
  );

  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  if (existsSync(buildId)) {
    let builtAt = "";
    try {
      builtAt = statSync(buildId).mtime.toISOString();
    } catch {
      builtAt = "";
    }
    checks.push(
      ok(
        "runtime.build",
        "Build di produzione",
        builtAt ? `Build presente (${builtAt}).` : "Build presente."
      )
    );
  } else {
    checks.push(
      warn(
        "runtime.build",
        "Build di produzione",
        "Nessuna build in .next: sei in sviluppo o la build non è stata eseguita.",
        "Esegui `npm run build` prima di avviare `npm start`."
      )
    );
  }

  checks.push(
    existsSync(path.join(ROOT, ".env"))
      ? ok("runtime.env", "File .env", "Presente. I valori non vengono letti né mostrati da questa pagina.")
      : info(
          "runtime.env",
          "File .env",
          "Non presente nella directory di lavoro.",
          "Le variabili possono arrivare dall'ambiente del processo o dal pannello del provider."
        )
  );

  return section(
    "runtime",
    "Progetto e runtime",
    checks,
    "Struttura del repository, file eseguibili e versione di Node.js."
  );
}

async function databaseSection(settings: Record<string, string>): Promise<HealthSection> {
  const checks: HealthCheck[] = [];
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push(ok("database.connection", "Connessione al database", "Prisma risponde a SELECT 1."));

    const now = Date.now();
    const [
      leads,
      verifications,
      retries,
      receipts,
      emailLogs,
      followUps,
      overdueFollowUps,
      incompleteLeads,
      overdueRetries,
      receiptRows,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.verification.count(),
      prisma.verificationRetry.count(),
      prisma.receipt.count(),
      prisma.emailLog.count(),
      prisma.followUp.count(),
      prisma.followUp.count({ where: { done: false, dueDate: { lt: new Date(now) } } }),
      prisma.lead.count({
        where: {
          OR: [{ city: null }, { city: "" }, { lat: null }, { lng: null }],
        },
      }),
      prisma.verificationRetry.count({
        where: { nextAttemptAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } },
      }),
      prisma.receipt.findMany({ select: { number: true } }),
    ]);

    checks.push(
      ok(
        "database.data",
        "Tabelle dati",
        `${leads} lead, ${verifications} verifiche, ${retries} controlli in coda, ${receipts} ricevute, ${emailLogs} email registrate, ${followUps} follow-up.`
      )
    );

    const duplicateNumbers = receiptRows
      .map((row) => row.number)
      .filter((number, index, all) => all.indexOf(number) !== index);
    checks.push(
      duplicateNumbers.length === 0
        ? ok("database.receipts", "Numeri ricevuta", "Nessun numero duplicato.")
        : fail(
            "database.receipts",
            "Numeri ricevuta",
            `${new Set(duplicateNumbers).size} numeri duplicati.`,
            "Non emettere altre ricevute finché non hai corretto i duplicati."
          )
    );

    checks.push(
      overdueRetries === 0
        ? ok("database.retries", "Coda verifiche", "Nessun controllo in ritardo di oltre 24 ore.")
        : warn(
            "database.retries",
            "Coda verifiche",
            `${overdueRetries} controlli in coda da oltre 24 ore.`,
            "L'app li riprova al prossimo avvio; puoi anche usare POST /api/leads/verify/retry."
          )
    );

    checks.push(
      overdueFollowUps === 0
        ? ok("database.followups", "Follow-up", "Nessun follow-up scaduto.")
        : warn(
            "database.followups",
            "Follow-up",
            `${overdueFollowUps} follow-up non completati sono scaduti.`,
            "Apri /calendario o /crm per gestirli."
          )
    );

    checks.push(
      incompleteLeads === 0
        ? ok("database.leads", "Qualità lead", "Tutti i lead hanno città e coordinate.")
        : warn(
            "database.leads",
            "Qualità lead",
            `${incompleteLeads} lead senza città o coordinate.`,
            "Non è un errore: alcuni lead possono essere importati senza posizione."
          )
    );

    checks.push(
      settings.search_city
        ? ok("database.onboarding", "Configurazione iniziale", `Città di ricerca: ${settings.search_city}.`)
        : warn(
            "database.onboarding",
            "Configurazione iniziale",
            "Nessuna città di ricerca salvata.",
            "Completa l'onboarding o imposta la città in Impostazioni."
          )
    );
  } catch (error) {
    checks.push(
      fail(
        "database.connection",
        "Connessione al database",
        error instanceof Error ? error.message : "Il database non risponde.",
        "Verifica DATABASE_URL, i permessi del file SQLite e `npm run setup`."
      )
    );
  }
  return section(
    "database",
    "Database",
    checks,
    "Connessione, integrità delle tabelle e code di lavoro."
  );
}

async function securitySection(): Promise<HealthSection> {
  const checks: HealthCheck[] = [
    authConfigured()
      ? ok("security.password", "Password di accesso", "APP_PASSWORD configurata (minimo 8 caratteri).")
      : fail(
          "security.password",
          "Password di accesso",
          "APP_PASSWORD mancante o troppo corta.",
          "Imposta una password di almeno 8 caratteri in .env e riavvia l'app."
        ),
  ];

  const middleware = readText("src/middleware.ts");
  if (!middleware) {
    checks.push(
      warn(
        "security.middleware",
        "Middleware di autenticazione",
        "File non leggibile (possibile deployment standalone).",
        "Verifica che il middleware sia incluso nella build."
      )
    );
  } else {
    const required = ["SESSION_COOKIE", "verifySessionToken", "sameOrigin"];
    const missing = required.filter((token) => !middleware.includes(token));
    checks.push(
      missing.length === 0
        ? ok("security.middleware", "Middleware di autenticazione", "Sessione, verifica token e controllo same-origin presenti.")
        : fail(
            "security.middleware",
            "Middleware di autenticazione",
            "Mancano: " + missing.join(", ") + ".",
            "Non esporre l'app finché il middleware non è completo."
          )
    );
  }

  const nextConfig = readText("next.config.mjs");
  const requiredHeaders = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ];
  if (!nextConfig) {
    checks.push(
      warn("security.headers", "Header di sicurezza", "next.config.mjs non leggibile.", "Verifica la configurazione della build.")
    );
  } else {
    const missing = requiredHeaders.filter((header) => !nextConfig.includes(header));
    checks.push(
      missing.length === 0
        ? ok("security.headers", "Header di sicurezza", "CSP, HSTS, frame, nosniff, referrer e permissions configurati.")
        : fail(
            "security.headers",
            "Header di sicurezza",
            "Mancano: " + missing.join(", ") + ".",
            "Ripristina gli header in next.config.mjs prima della produzione."
          )
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const parsed = new URL(baseUrl);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      checks.push(
        warn(
          "security.baseUrl",
          "URL pubblico",
          `${baseUrl} non usa HTTPS in produzione.`,
          "Metti l'app dietro un proxy TLS e imposta NEXT_PUBLIC_BASE_URL su https://."
        )
      );
    } else {
      checks.push(ok("security.baseUrl", "URL pubblico", `${baseUrl} (${parsed.protocol.replace(":", "")}).`));
    }
  } catch {
    checks.push(
      fail(
        "security.baseUrl",
        "URL pubblico",
        "NEXT_PUBLIC_BASE_URL non è un URL valido.",
        "Correggi NEXT_PUBLIC_BASE_URL in .env."
      )
    );
  }

  checks.push(
    process.env.TRUST_PROXY === "1"
      ? info(
          "security.proxy",
          "Proxy fidato",
          "TRUST_PROXY=1: gli header X-Forwarded-For sono usati per il rate limit.",
          "Usalo solo se l'app è raggiungibile esclusivamente tramite il proxy."
        )
      : info(
          "security.proxy",
          "Proxy fidato",
          "TRUST_PROXY non attivo: il rate limit usa la connessione diretta.",
          "Attivalo solo se metti l'app dietro un reverse proxy controllato."
        )
  );

  try {
    const keys = await prisma.apiKey.findMany({ select: { enabled: true } });
    const disabled = keys.filter((key) => !key.enabled).length;
    checks.push(
      keys.length === 0
        ? info("security.apiKeys", "API keys", "Nessuna chiave API creata.")
        : disabled > 0
          ? warn(
              "security.apiKeys",
              "API keys",
              `${disabled} chiavi su ${keys.length} sono sospese.`,
              "Riattivale o revocale da Impostazioni."
            )
          : ok("security.apiKeys", "API keys", `${keys.length} chiavi attive.`)
    );
  } catch {
    checks.push(
      warn(
        "security.apiKeys",
        "API keys",
        "Impossibile leggere le chiavi API dal database.",
        "Controlla la connessione al database."
      )
    );
  }

  return section(
    "security",
    "Sicurezza",
    checks,
    "Autenticazione, header HTTP, URL pubblico e chiavi di integrazione."
  );
}

async function integrationSection(settings: Record<string, string>): Promise<HealthSection> {
  const checks: HealthCheck[] = [];
  const ai = await getAiConfig();
  const aiProviders = [
    ai.geminiKey ? "Gemini" : null,
    ai.groqKey ? "Groq" : null,
  ].filter(Boolean);

  checks.push(
    aiProviders.length > 0
      ? ok("integration.ai", "Provider AI", `Configurati: ${aiProviders.join(" + ")}.`)
      : warn(
          "integration.ai",
          "Provider AI",
          "Nessun provider AI configurato: le funzioni AI sono spente, il resto dell'app funziona.",
          "Aggiungi una chiave Gemini o Groq in Impostazioni se vuoi usare siti demo e messaggi AI."
        )
  );

  const smtpHost = (settings.smtp_host || process.env.SMTP_HOST || "").trim();
  const smtpUser = (settings.smtp_user || process.env.SMTP_USER || "").trim();
  const smtpPass = (settings.smtp_pass || process.env.SMTP_PASS || "").trim();
  if (!smtpHost) {
    checks.push(
      ok(
        "integration.smtp",
        "Invio email",
        "SMTP non configurato: l'app salva le email come file .eml in tmp/emails.",
        "Configura SMTP in Impostazioni per l'invio reale."
      )
    );
  } else if (!smtpUser && !smtpPass) {
    checks.push(
      warn(
        "integration.smtp",
        "Invio email",
        `Host ${smtpHost} configurato senza utente o password.`,
        "Potrebbe essere un relay locale; verifica la configurazione SMTP."
      )
    );
  } else {
    checks.push(
      ok(
        "integration.smtp",
        "Invio email",
        `Host ${smtpHost} configurato. L'invio non viene eseguito da questa pagina.`
      )
    );
  }

  const geoKey = (settings.geoapify_api_key || process.env.GEOAPIFY_API_KEY || "").trim();
  const tomtomKey = (settings.tomtom_api_key || process.env.TOMTOM_API_KEY || "").trim();
  checks.push(
    geoKey
      ? ok("integration.geoapify", "Geoapify", "Chiave configurata: seconda fonte geografica attiva.")
      : info("integration.geoapify", "Geoapify", "Non configurata (opzionale): resta attiva OpenStreetMap.")
  );
  checks.push(
    tomtomKey
      ? ok("integration.tomtom", "TomTom", "Chiave configurata: terza fonte geografica attiva.")
      : info("integration.tomtom", "TomTom", "Non configurata (opzionale): restano OSM e Geoapify se presente.")
  );

  const osmContact = settings.osm_contact_email || process.env.OSM_CONTACT_EMAIL;
  checks.push(
    isRealContactEmail(osmContact)
      ? ok("integration.osm", "Contatto OpenStreetMap", "Email di contatto reale configurata.")
      : warn(
          "integration.osm",
          "Contatto OpenStreetMap",
          "Nessuna email reale configurata: l'app usa l'URL pubblico del progetto.",
          "È accettato da OSM, ma un contatto reale è consigliato per un uso intenso."
        )
  );

  const playwright = packageInstalled("playwright");
  checks.push(
    playwright
      ? ok(
          "integration.playwright",
          "Screenshot siti",
          "Pacchetto Playwright installato. Il browser non viene avviato da questa pagina.",
          "Se manca Chromium esegui `npm run setup:screenshot`."
        )
      : warn(
          "integration.playwright",
          "Screenshot siti",
          "Playwright non installato: la funzione screenshot è disattivata.",
          "Esegui `npm run setup:screenshot` per installarlo."
        )
  );

  const publicDir = path.join(ROOT, "public");
  checks.push(
    directoryWritable("public")
      ? ok(
          "integration.screenshots",
          "Cartella screenshot",
          publicDir + (existsSync(path.join(publicDir, "screenshots")) ? " con screenshots/." : " scrivibile; screenshots/ verrà creata al primo utilizzo.")
        )
      : warn(
          "integration.screenshots",
          "Cartella screenshot",
          "public/ non è scrivibile.",
          "Correggi i permessi della cartella public/."
        )
  );

  checks.push(
    directoryWritable(".")
      ? ok(
          "integration.emails",
          "Fallback email",
          "La directory del progetto è scrivibile: tmp/emails può essere creata al primo invio locale."
        )
      : warn(
          "integration.emails",
          "Fallback email",
          "La directory del progetto non è scrivibile: il fallback .eml potrebbe fallire.",
          "Correggi i permessi della directory di lavoro."
        )
  );

  checks.push(
    info(
      "integration.network",
      "Servizi esterni",
      "Overpass, Nominatim, AI, SMTP e provider geografici non vengono interrogati dalla pagina di salute.",
      "Apri Ricerca o Verifica dati per provare la connettività reale."
    )
  );

  return section(
    "integrations",
    "Integrazioni",
    checks,
    "Funzioni opzionali: l'app continua a funzionare quando una chiave non è configurata."
  );
}

export async function runHealthChecks(): Promise<HealthReport> {
  const pkg = readPackage();
  let settings: Record<string, string> = {};
  try {
    settings = await getSettings();
  } catch {
    // Il controllo database mostrerà l'errore; qui restano solo i valori .env.
  }

  const sections = [
    runtimeSection(pkg),
    await databaseSection(settings),
    await securitySection(),
    await integrationSection(settings),
  ];
  const { overall, summary } = summarizeHealth(sections);
  return {
    checkedAt: new Date().toISOString(),
    overall,
    summary,
    sections,
  };
}
