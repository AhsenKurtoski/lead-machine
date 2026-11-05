"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCsv } from "@/lib/csv";
import {
  Save,
  Download,
  Upload,
  Loader2,
  Check,
  Database,
  Palette,
  KeyRound,
  Mail,
  Plus,
  Copy,
  Trash2,
  Power,
  Code2,
  ShieldCheck,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/use-toast";
import { useLocale } from "@/components/locale-provider";

const FIELDS: { key: string; label: string; placeholder: string; hint?: string }[] = [
  { key: "brand_name", label: "Nome attivita / agenzia", placeholder: "La Tua Web Agency" },
  { key: "brand_owner", label: "Referente operativo (chi segue i clienti)", placeholder: "Il Tuo Nome" },
  { key: "brand_phone", label: "Telefono", placeholder: "+39 333 1234567" },
  { key: "brand_email", label: "Email", placeholder: "tu@esempio.it" },
  { key: "formsubmit_email", label: "Email prenotazioni sito demo (FormSubmit)", placeholder: "tu@esempio.it", hint: "Dove arrivano le richieste dei moduli di prenotazione nei siti demo. Gratis, senza carta: la prima volta FormSubmit invia una email di conferma da approvare." },
  { key: "brand_tagline", label: "Slogan (tagline)", placeholder: "Premium Digital Agency" },
  { key: "brand_logo", label: "URL logo (lascia /logo.png)", placeholder: "/logo.png" },
  { key: "search_city", label: "Citta di ricerca predefinita", placeholder: "es. Milano" },
];

const AI_FIELDS: { key: string; label: string; placeholder: string; hint?: string }[] = [
  {
    key: "gemini_api_key",
    label: "Chiave API Google Gemini",
    placeholder: "AIza...",
    hint: "Gratuita su aistudio.google.com/app/apikey. Serve per i siti demo AI e per la ricerca del sito su Google.",
  },
  {
    key: "groq_api_key",
    label: "Chiave API Groq (facoltativa)",
    placeholder: "gsk_...",
    hint: "Gratuita su console.groq.com/keys. Fa da riserva automatica a Gemini se esaurisce la quota.",
  },
];

const SEARCH_FIELDS: { key: string; label: string; placeholder: string; hint?: string }[] = [
  {
    key: "geoapify_api_key",
    label: "Chiave API Geoapify (facoltativa)",
    placeholder: "chiave Geoapify...",
    hint: "Gratuita e SENZA carta di credito su geoapify.com (3000 ricerche/giorno). Si affianca a OpenStreetMap per trovare piu attivita.",
  },
  {
    key: "tomtom_api_key",
    label: "Chiave API TomTom (facoltativa)",
    placeholder: "chiave TomTom...",
    hint: "Terza fonte geografica, gratuita e SENZA carta di credito su developer.tomtom.com (5000 ricerche/mese). Si affianca a OpenStreetMap e Geoapify: con piu fonti la ricerca trova piu attivita, e le tre vengono interrogate insieme.",
  },
];

// Fonti OpenStreetMap: non sono chiavi, sono solo l'identificativo che la
// fair-use policy di OSM chiede di mandare insieme alle richieste di ricerca e
// geocoding. Senza, l'app si identifica con l'URL del progetto.
const OSM_FIELDS: { key: string; label: string; placeholder: string; hint?: string }[] = [
  {
    key: "osm_contact_email",
    label: "Email di contatto per OpenStreetMap (facoltativa)",
    placeholder: "tu@esempio.it",
    hint: "Non e' una chiave e non serve per attivare nulla: OpenStreetMap (Overpass e Nominatim) la usa solo per identificare le tue richieste di ricerca e geocoding. Lasciandola vuota l'app si identifica con l'URL del progetto, che e' accettato. Un indirizzo segnaposto (es. tu@esempio.it) viene ignorato: Nominatim risponde 403 a quelli e il geocoding smetterebbe di funzionare.",
  },
];

const SMTP_FIELDS: { key: string; label: string; placeholder: string; hint?: string }[] = [
  { key: "smtp_host", label: "Server SMTP", placeholder: "smtp.gmail.com" },
  { key: "smtp_port", label: "Porta", placeholder: "587", hint: "587 (consigliata) oppure 465 per connessione sicura." },
  { key: "smtp_user", label: "Utente / email", placeholder: "tuamail@gmail.com" },
  {
    key: "smtp_pass",
    label: "Password per le app",
    placeholder: "xxxx xxxx xxxx xxxx",
    hint: "Per Gmail crea una 'Password per le app' (NON la password normale): myaccount.google.com/apppasswords (richiede la verifica in 2 passaggi attiva).",
  },
  { key: "smtp_from", label: "Mittente (From)", placeholder: "Il Tuo Nome <tuamail@gmail.com>", hint: "Facoltativo. Se vuoto si usa l'email utente qui sopra." },
];

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

// Profili di accesso professionali: ogni profilo mappa su scope reali
// applicati lato server (read, write, search, ai).
const KEY_PRESETS = [
  { id: "full", scopes: ["read", "write", "search", "ai"] },
  { id: "search", scopes: ["read", "search"] },
  { id: "readonly", scopes: ["read"] },
  { id: "writeonly", scopes: ["write"] },
] as const;

const ALL_SCOPES = ["read", "write", "search", "ai"] as const;

const SCOPE_LABEL_KEY: Record<string, string> = {
  read: "api.scopeRead",
  write: "api.scopeWrite",
  search: "api.scopeSearch",
  ai: "api.scopeAi",
};

function parseScopesList(permissions: string | null | undefined): string[] {
  const raw = (permissions ?? "").toLowerCase();
  if (raw === "*" || raw === "all" || raw === "admin") return [...ALL_SCOPES];
  return ALL_SCOPES.filter((s) => raw.split(",").map((p) => p.trim()).includes(s));
}

function presetForScopes(scopes: string[]): string {
  const sorted = [...scopes].sort().join(",");
  const found = KEY_PRESETS.find((p) => [...p.scopes].sort().join(",") === sorted);
  return found ? found.id : "custom";
}

// URL base dell'API mostrato negli esempi. Valore deterministico: lo stesso
// sul server e al primo render del client (le variabili d'ambiente, altrimenti
// localhost).
function serverApiBase(): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/+$/, "");
  return "http://localhost:3000";
}

// L'origine reale del browser (sempre corretta, anche con tunnel, dominio o
// VPS) si legge DOPO il mount, in un effetto: leggerla durante il render
// faceva divergere il testo del server da quello del client e React idratava
// con un errore (#418) ributtando giu' il contenuto della pagina.
function useApiBase(): string {
  const [base, setBase] = React.useState(serverApiBase);
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      setBase(window.location.origin);
    }
  }, []);
  return base;
}

function formatDateTime(iso: string | null, t: (key: string) => string): string {
  if (!iso) return t("api.neverUsed");
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function API_USAGE_EXAMPLES() {
  const { t } = useLocale();
  const base = useApiBase();
  return (
    <details className="rounded-lg border bg-muted/20 p-4">
      <summary className="cursor-pointer text-sm font-medium">
        {t("api.examplesTitle")}
      </summary>
      <div className="mt-3 space-y-3 text-xs">
        <div>
          <p className="mb-1 font-medium">{t("api.example1")}</p>
          <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed">
{`fetch("${base}/api/v1/leads?hasWebsite=false&city=Milano", {
  headers: { "x-api-key": "LA_TUA_CHIAVE" }
})
  .then((r) => r.json())
  .then((d) => console.log(d.leads));`}
          </pre>
        </div>
        <div>
          <p className="mb-1 font-medium">{t("api.example2")}</p>
          <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed">
{`fetch("${base}/api/v1/search", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": "LA_TUA_CHIAVE" },
  body: JSON.stringify({ categories: ["ristorante"], searchCity: "Milano", radius: 5000 })
})
  .then((r) => r.json())
  .then((d) => console.log(d.leads));`}
          </pre>
        </div>
        <div>
          <p className="mb-1 font-medium">{t("api.example3")}</p>
          <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed">
{`fetch("${base}/api/v1/demo/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": "LA_TUA_CHIAVE" },
  body: JSON.stringify({ leadId: "ID_DEL_LEAD" })
})
  .then((r) => r.json())
  .then((d) => console.log(d.html));`}
          </pre>
        </div>
        <p className="text-muted-foreground">{t("api.bearerNote")}</p>
      </div>
    </details>
  );
}

export default function ImpostazioniPage() {
  const { t } = useLocale();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const [aiInfo, setAiInfo] = React.useState<string | null>(null);
  const [checkingAi, setCheckingAi] = React.useState(false);

  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // API Keys per integrazioni esterne
  const [apiKeys, setApiKeys] = React.useState<ApiKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = React.useState(true);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [generatingKey, setGeneratingKey] = React.useState(false);
  const [revealedKey, setRevealedKey] = React.useState<string | null>(null);
  const [revokeId, setRevokeId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [presetId, setPresetId] = React.useState<string>("full");
  const [customScopes, setCustomScopes] = React.useState<string[]>(["read", "write", "search", "ai"]);
  const [editingScopesId, setEditingScopesId] = React.useState<string | null>(null);
  const [editScopes, setEditScopes] = React.useState<string[]>([]);
  const [savingScopes, setSavingScopes] = React.useState(false);

  const loadKeys = React.useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      setApiKeys(data.keys ?? []);
    } catch {
      setApiKeys([]);
    }
    setKeysLoading(false);
  }, []);

  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setValues(d.settings ?? {});
        setLoading(false);
      });
    loadKeys();
  }, [loadKeys]);

  async function createApiKey() {
    const preset = KEY_PRESETS.find((p) => p.id === presetId);
    const scopes = preset ? [...preset.scopes] : customScopes;
    if (scopes.length === 0) {
      toast({
        title: t("toast.errorTitle"),
        description: t("api.noScopesError"),
        variant: "destructive",
      });
      return;
    }

    setGeneratingKey(true);
    setRevealedKey(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim() || "Integrazione esterna",
          permissions: scopes.join(","),
        }),
      });
      const data = await res.json();
      if (data.ok && data.rawKey) {
        setRevealedKey(data.rawKey);
        setNewKeyName("");
        toast({
          title: t("api.generatedTitle"),
          description: t("api.generatedDesc"),
          variant: "success",
        });
        loadKeys();
      } else {
        toast({
          title: t("toast.errorTitle"),
          description: data.error || t("toast.networkDesc"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("toast.networkTitle"),
        description: t("toast.networkDesc"),
        variant: "destructive",
      });
    }
    setGeneratingKey(false);
  }

  async function toggleApiKey(id: string, enabled: boolean) {
    try {
      await fetch("/api/keys/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      toast({
        title: enabled ? t("api.reactivatedToastTitle") : t("api.suspendedToastTitle"),
        description: enabled ? t("api.reactivatedToastDesc") : t("api.suspendedToastDesc"),
        variant: "success",
      });
      loadKeys();
    } catch {
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.networkDesc"),
        variant: "destructive",
      });
    }
  }

  function startEditScopes(k: ApiKeyRow) {
    setEditingScopesId(k.id);
    setEditScopes(parseScopesList(k.permissions));
  }

  function toggleEditScope(scope: string) {
    setEditScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function saveScopes() {
    if (!editingScopesId) return;
    if (editScopes.length === 0) {
      toast({
        title: t("toast.errorTitle"),
        description: t("api.noScopesError"),
        variant: "destructive",
      });
      return;
    }
    setSavingScopes(true);
    try {
      const res = await fetch("/api/keys/" + editingScopesId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editScopes.join(",") }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: t("api.scopesSavedTitle"),
          description: t("api.scopesSavedDesc"),
          variant: "success",
        });
        setEditingScopesId(null);
        loadKeys();
      } else {
        toast({
          title: t("toast.errorTitle"),
          description: data.error || t("toast.networkDesc"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("toast.networkTitle"),
        description: t("toast.networkDesc"),
        variant: "destructive",
      });
    }
    setSavingScopes(false);
  }

  async function confirmRevokeKey() {
    if (!revokeId) return;
    try {
      const res = await fetch("/api/keys/" + revokeId, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: t("api.revokedToastTitle"),
          description: t("api.revokedToastDesc"),
          variant: "success",
        });
        loadKeys();
      } else {
        toast({
          title: t("toast.errorTitle"),
          description: data.error || t("toast.deleteFailedDesc"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("toast.networkTitle"),
        description: t("toast.deleteFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setRevokeId(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: t("toast.copiedTitle"),
        description: t("toast.copiedDesc"),
        variant: "success",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("toast.copyFailedTitle"),
        description: t("toast.copyFailedDesc"),
        variant: "destructive",
      });
    }
  }


  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  const [rejectWarning, setRejectWarning] = React.useState<string | null>(null);

  async function save() {
    setSaving(true);
    setRejectWarning(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values }),
      });
      const data = await res.json().catch(() => ({}));
      if (data && Array.isArray(data.rejected) && data.rejected.length > 0) {
        const details = data.rejected
          .map((r: { key: string; reason: string }) => r.key + " [" + r.reason + "]")
          .join(", ");
        setRejectWarning(
          "Attenzione: " + data.rejected.length + " campo/i non salvati per whitelist o non validi: " + details
        );
        console.warn("[Impostazioni] Chiavi rifiutate:", data.rejected);
        toast({
          title: t("toast.partialTitle"),
          description: t("toast.partialDesc", { n: data.rejected.length }),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("toast.savedTitle"),
          description: t("toast.savedDesc"),
          variant: "success",
        });
      }
    } catch {
      setRejectWarning("Errore di rete durante il salvataggio.");
      toast({
        title: t("toast.networkTitle"),
        description: t("toast.savedDesc"),
        variant: "destructive",
      });
    }
    setSaving(false);
    setSaved(true);
  }

  async function checkAi() {
    setCheckingAi(true);
    setAiInfo(null);
    try {
      const r = await fetch("/api/ai/status");
      const d = await r.json();
      const gem = d.gemini ? "OK (fonte: " + d.geminiSource + ")" : "assente";
      const grq = d.groq ? "OK (fonte: " + d.groqSource + ")" : "assente";
      setAiInfo("Gemini: " + gem + "   \u2022   Groq: " + grq);
    } catch {
      setAiInfo("Impossibile verificare lo stato delle chiavi.");
    }
    setCheckingAi(false);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setImportResult(
        "Importati " + (data.created ?? 0) + " lead, " + (data.skipped ?? 0) + " saltati (gia presenti o senza nome)."
      );
    } catch {
      setImportResult("Errore durante la lettura del file CSV.");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Stato delle funzioni in base a quello che e' configurato. La stessa lista
  // risponde alla domanda "cosa funziona senza chiavi?": le prime voci sono
  // attive appena scarichi l'app, senza attivazione e senza account.
  const keyStatus: { label: string; detail: string; state: "on" | "optional" | "off" }[] = [
    {
      label: "Ricerca attivita e mappa",
      detail: "OpenStreetMap / Overpass: nessuna chiave",
      state: "on",
    },
    {
      label: "Citta, comune e provincia",
      detail: "geocoding Nominatim con ripiego su Photon: nessuna chiave",
      state: "on",
    },
    {
      label: "Verifica dei dati del lead",
      detail: "record MX reali e risposta HTTP del sito: nessuna chiave",
      state: "on",
    },
    {
      label: "CRM, ricevute, backup, siti demo",
      detail: "tutto in locale, nel tuo database SQLite",
      state: "on",
    },
    {
      label: "Seconda fonte geografica (Geoapify)",
      detail: values.geoapify_api_key
        ? "chiave configurata"
        : "facoltativa: si affianca a OpenStreetMap per trovare piu attivita",
      state: values.geoapify_api_key ? "on" : "optional",
    },
    {
      label: "Terza fonte geografica (TomTom)",
      detail: values.tomtom_api_key
        ? "chiave configurata"
        : "facoltativa: si affianca a OpenStreetMap e Geoapify",
      state: values.tomtom_api_key ? "on" : "optional",
    },
    {
      label: "AI (siti demo su misura, cold call, messaggi)",
      detail:
        values.gemini_api_key || values.groq_api_key
          ? "chiave configurata"
          : "serve una chiave gratuita Gemini o Groq (senza, l'app usa testi modello)",
      state: values.gemini_api_key || values.groq_api_key ? "on" : "off",
    },
    {
      label: "Invio email automatico",
      detail: values.smtp_host
        ? "SMTP configurato"
        : "serve un account SMTP (es. Gmail con una password per le app)",
      state: values.smtp_host ? "on" : "off",
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
        <p className="text-muted-foreground">
          Dati del tuo brand, esportazione/importazione lead e backup.
        </p>
      </div>

      {/* Nessuna attivazione: cosa funziona senza chiavi */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5" /> Cosa funziona senza chiavi
          </h2>
          <p className="text-sm text-muted-foreground">
            Qui non c&apos;e&apos; niente da attivare e nessun account da creare: l&apos;app gira sul
            tuo computer, le chiavi che generi restano nel tuo database e nessuno controlla licenze.
          </p>
          {loading ? (
            <div className="flex h-16 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {keyStatus.map((row) => (
                <li key={row.label} className="flex items-start gap-2">
                  {row.state === "on" ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle
                      className={
                        "mt-0.5 h-4 w-4 shrink-0 " +
                        (row.state === "optional" ? "text-amber-500" : "text-muted-foreground")
                      }
                    />
                  )}
                  <span>
                    <span className="font-medium">{row.label}</span>
                    <span className="text-muted-foreground"> — {row.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Le funzioni che interrogano la rete (ricerca, geocoding, verifica dei dati) hanno bisogno
            di internet; CRM, mappa, ricevute, backup e i siti demo gia generati funzionano anche
            offline.
          </p>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Palette className="h-5 w-5" /> Il tuo brand
          </h2>
          <p className="text-sm text-muted-foreground">
            Questi dati compaiono in automatico nei messaggi WhatsApp/Email e nell'intestazione delle anteprime sito e delle ricevute di pagamento.
          </p>
          {loading ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salva impostazioni
            </Button>
            {saved ? (
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <Check className="h-4 w-4" /> Salvato
              </span>
            ) : null}
            {rejectWarning ? (
              <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-3 py-1.5 text-sm text-amber-700 dark:text-amber-400">
                {rejectWarning}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Salva impostazioni */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Salva impostazioni</h2>
          <p className="text-sm text-muted-foreground">
            Salva i dati del brand e i contatti che usi nei messaggi e nelle ricevute di pagamento.
          </p>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salva
          </Button>
        </CardContent>
      </Card>

      {/* Chiavi AI */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="h-5 w-5" /> Chiavi AI (siti demo e ricerca sito)
          </h2>
          <p className="text-sm text-muted-foreground">
            Incolla qui le tue chiavi gratuite: vengono salvate nell'app e usate subito, senza toccare il file .env.
            Con entrambe, se una esaurisce la quota si passa in automatico all'altra.
          </p>
          {loading ? null : (
            <div className="grid gap-4">
              {AI_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type="password"
                    autoComplete="off"
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                  {f.hint ? (
                    <p className="text-xs text-muted-foreground">{f.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={saving || loading}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salva chiavi
            </Button>
            <Button variant="outline" onClick={checkAi} disabled={checkingAi || loading}>
              {checkingAi ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Verifica chiavi
            </Button>
            {aiInfo ? (
              <span className="text-sm text-muted-foreground">{aiInfo}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Chiavi ricerca attivita */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="h-5 w-5" /> Fonti di ricerca attivita
          </h2>
          <p className="text-sm text-muted-foreground">
            La ricerca usa sempre OpenStreetMap (gratis). Aggiungendo una chiave Geoapify gratuita
            (senza carta di credito) ottieni una seconda fonte: piu attivita trovate e meno blocchi quando OSM e sovraccarico.
          </p>
          {loading ? null : (
            <div className="grid gap-4">
              {SEARCH_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type="password"
                    autoComplete="off"
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                  {f.hint ? (
                    <p className="text-xs text-muted-foreground">{f.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <Button onClick={save} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salva chiave
          </Button>
        </CardContent>
      </Card>

      {/* Contatto OpenStreetMap (non e' una chiave) */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Globe className="h-5 w-5" /> Contatto OpenStreetMap
          </h2>
          <p className="text-sm text-muted-foreground">
            OpenStreetMap e gratuito e non richiede chiavi: chiede solo chi sta facendo le richieste.
            Facoltativo, e senza di esso la ricerca funziona comunque.
          </p>
          {loading ? null : (
            <div className="grid gap-4">
              {OSM_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type="text"
                    autoComplete="off"
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                  {f.hint ? <p className="text-xs text-muted-foreground">{f.hint}</p> : null}
                </div>
              ))}
            </div>
          )}
          <Button onClick={save} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salva contatto
          </Button>
        </CardContent>
      </Card>

      {/* Email / SMTP */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Mail className="h-5 w-5" /> Email (invio automatico)
          </h2>
          <p className="text-sm text-muted-foreground">
            Configura l'invio email per scrivere ai lead con un clic dal CRM (pulsante "Invia email ora").
            Con Gmail usa una "Password per le app" gratuita, non la password normale.
          </p>
          {loading ? null : (
            <div className="grid gap-4">
              {SMTP_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type={f.key === "smtp_pass" ? "password" : "text"}
                    autoComplete="off"
                    value={values[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                  {f.hint ? (
                    <p className="text-xs text-muted-foreground">{f.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <Button onClick={save} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salva email
          </Button>
        </CardContent>
      </Card>

      {/* API Key & Integrazioni esterne */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Code2 className="h-5 w-5" /> {t("api.title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("api.subtitle")}</p>
            <p className="text-xs text-muted-foreground">
              Le chiavi sono create e controllate su questo computer: nel tuo database viene salvato
              solo l&apos;hash SHA-256, e ogni chiamata viene verificata qui. Funzionano senza
              attivazione, senza account e senza internet, anche appena scarichi l&apos;app.
            </p>
          </div>

          {/* Generazione nuova chiave */}
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="api-key-name">{t("api.keyName")}</Label>
                <Input
                  id="api-key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t("api.keyNamePlaceholder")}
                />
              </div>
              <Button onClick={createApiKey} disabled={generatingKey}>
                {generatingKey ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {t("api.generate")}
              </Button>
            </div>

            {/* Profilo di accesso */}
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">{t("api.scopeSectionTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("api.scopeSectionHint")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[...KEY_PRESETS, { id: "custom", scopes: [] }].map((p) => {
                  const active = presetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPresetId(p.id)}
                      aria-pressed={active}
                      className={
                        "rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                        (active
                          ? "border-primary bg-primary/10"
                          : "border-input bg-background hover:bg-accent")
                      }
                    >
                      <span className="block text-sm font-medium">
                        {t(
                          p.id === "full"
                            ? "api.presetFull"
                            : p.id === "search"
                              ? "api.presetSearch"
                              : p.id === "readonly"
                                ? "api.presetReadonly"
                                : p.id === "writeonly"
                                  ? "api.presetWriteonly"
                                  : "api.presetCustom"
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {t(
                          p.id === "full"
                            ? "api.presetFullDesc"
                            : p.id === "search"
                              ? "api.presetSearchDesc"
                              : p.id === "readonly"
                                ? "api.presetReadonlyDesc"
                                : p.id === "writeonly"
                                  ? "api.presetWriteonlyDesc"
                                  : "api.presetCustomDesc"
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {presetId === "custom" ? (
                <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
                  {ALL_SCOPES.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={customScopes.includes(s)}
                        onChange={(e) =>
                          setCustomScopes((prev) =>
                            e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)
                          )
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                      {t(SCOPE_LABEL_KEY[s])}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Chiave appena generata */}
          {revealedKey ? (
            <div className="space-y-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 animate-fade-in">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {t("api.copyNow")}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-xs select-all">
                  {revealedKey}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(revealedKey)}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {t("api.copy")}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Elenco chiavi */}
          {keysLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              {t("api.empty")}
            </p>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((k) => {
                const scopes = parseScopesList(k.permissions);
                const preset = presetForScopes(scopes);
                const presetLabel = t(
                  preset === "full"
                    ? "api.presetFull"
                    : preset === "search"
                      ? "api.presetSearch"
                      : preset === "readonly"
                        ? "api.presetReadonly"
                        : preset === "writeonly"
                          ? "api.presetWriteonly"
                          : "api.presetCustom"
                );
                const isEditing = editingScopesId === k.id;
                return (
                  <div key={k.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{k.name}</span>
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-xs font-medium " +
                              (k.enabled
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-zinc-500/15 text-zinc-500")
                            }
                          >
                            {k.enabled ? t("api.active") : t("api.suspended")}
                          </span>
                          <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            {presetLabel}
                          </span>
                        </div>
                        <code className="block font-mono text-xs text-muted-foreground">{k.keyPrefix}</code>
                        <p className="text-xs text-muted-foreground">
                          {t("api.permissionsLabel")}:{" "}
                          {scopes.length ? scopes.map((s) => t(SCOPE_LABEL_KEY[s])).join(" · ") : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("api.created")}: {formatDateTime(k.createdAt, t)} · {t("api.lastUsed")}:{" "}
                          {k.lastUsedAt ? formatDateTime(k.lastUsedAt, t) : t("api.neverUsed")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditScopes(k)}>
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          {t("api.editScopes")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleApiKey(k.id, !k.enabled)}>
                          <Power className="mr-2 h-4 w-4" />
                          {k.enabled ? t("api.suspend") : t("api.reactivate")}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRevokeId(k.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("api.revoke")}
                        </Button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                        <p className="text-xs font-medium">{t("api.scopeSectionTitle")}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {ALL_SCOPES.map((s) => (
                            <label key={s} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={editScopes.includes(s)}
                                onChange={() => toggleEditScope(s)}
                                className="h-4 w-4 rounded border-input"
                              />
                              {t(SCOPE_LABEL_KEY[s])}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveScopes} disabled={savingScopes}>
                            {savingScopes ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}
                            {t("api.saveScopes")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingScopesId(null)}
                            disabled={savingScopes}
                          >
                            {t("confirm.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <API_USAGE_EXAMPLES />

          <ConfirmDialog
            open={Boolean(revokeId)}
            onOpenChange={(open) => !open && setRevokeId(null)}
            title={t("api.confirmRevokeTitle")}
            description={t("api.confirmRevokeDesc")}
            confirmText={t("api.confirmRevokeText")}
            cancelText={t("confirm.cancel")}
            variant="destructive"
            onConfirm={confirmRevokeKey}
          />
        </CardContent>
      </Card>

      {/* Export / Backup */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Download className="h-5 w-5" /> Esporta & Backup
          </h2>
          <p className="text-sm text-muted-foreground">
            Scarica i tuoi lead in CSV (apribile con Excel/Google Fogli) oppure un backup completo in JSON.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/api/leads/export" download>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Esporta lead (CSV)
              </Button>
            </a>
            <a href="/api/backup" download>
              <Button variant="outline">
                <Database className="mr-2 h-4 w-4" /> Backup completo (JSON)
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Upload className="h-5 w-5" /> Importa lead da CSV
          </h2>
          <p className="text-sm text-muted-foreground">
            Carica un file CSV con intestazioni (almeno la colonna <code>name</code>). I duplicati con stesso nome e citta vengono saltati.
            Usa lo stesso formato del file esportato qui sopra.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onImportFile}
            disabled={importing}
            className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          {importing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Importazione in corso...
            </div>
          ) : null}
          {importResult ? (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">{importResult}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
