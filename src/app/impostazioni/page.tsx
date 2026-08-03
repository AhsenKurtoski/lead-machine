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
} from "lucide-react";

const FIELDS: { key: string; label: string; placeholder: string; hint?: string }[] = [
  { key: "brand_name", label: "Nome attivita / agenzia", placeholder: "La Tua Web Agency" },
  { key: "brand_owner", label: "Referente operativo (chi segue i clienti)", placeholder: "Il Tuo Nome" },
  { key: "brand_holder", label: "Intestatario per fatture/preventivi (adulto)", placeholder: "Nome e cognome del titolare adulto", hint: "Compare nei preventivi come intestatario. Se sei minorenne, qui va il nome dell'adulto che gestisce pagamenti e fisco." },
  { key: "brand_phone", label: "Telefono", placeholder: "+39 333 1234567" },
  { key: "brand_email", label: "Email", placeholder: "tu@esempio.it" },
  { key: "formsubmit_email", label: "Email prenotazioni sito demo (FormSubmit)", placeholder: "tu@esempio.it", hint: "Dove arrivano le richieste dei moduli di prenotazione nei siti demo. Gratis, senza carta: la prima volta FormSubmit invia una email di conferma da approvare." },
  { key: "brand_tagline", label: "Slogan (tagline)", placeholder: "Premium Digital Agency" },
  { key: "brand_logo", label: "URL logo (lascia /logo.png)", placeholder: "/logo.png" },
  { key: "search_city", label: "Citta di ricerca predefinita", placeholder: "Feltre" },
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

export default function ImpostazioniPage() {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const [aiInfo, setAiInfo] = React.useState<string | null>(null);
  const [checkingAi, setCheckingAi] = React.useState(false);

  const [importing, setImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setValues(d.settings ?? {});
        setLoading(false);
      });
  }, []);

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
      }
    } catch {
      setRejectWarning("Errore di rete durante il salvataggio.");
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
        <p className="text-muted-foreground">
          Dati del tuo brand, esportazione/importazione lead e backup.
        </p>
      </div>

      {/* Branding */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Palette className="h-5 w-5" /> Il tuo brand
          </h2>
          <p className="text-sm text-muted-foreground">
            Questi dati compaiono in automatico nei messaggi WhatsApp/Email e nell'intestazione dei preventivi.
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
            Salva i dati del brand e i contatti che usi nei preventivi e nelle ricevute.
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
            <a href="/api/leads/export">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Esporta lead (CSV)
              </Button>
            </a>
            <a href="/api/backup">
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
