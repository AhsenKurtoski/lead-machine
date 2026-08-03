"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import {
  MapPin,
  Search as SearchIcon,
  Loader2,
  Sparkles,
  Mail,
  Phone,
  Globe,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  TerminalSquare,
  Github,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  clearByokKeysLocal,
  loadByokKeysLocal,
  storeByokKeysLocal,
} from "@/lib/crypto";
import { callDemoAi, callProvider } from "@/lib/demo/ai";
import { GITHUB_CLONE, GITHUB_REPO } from "@/lib/site";
import { searchLeads, type Lead, type SearchParams } from "@/lib/demo/lead-search";

export type DemoDict = {
  title: string;
  subtitle: string;
  search: {
    title: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    cityLabel: string;
    cityPlaceholder: string;
    radiusLabel: string;
    search: string;
    searching: string;
    results: string;
    noResults: string;
    error: string;
    score: string;
    distance: string;
  };
  lead: {
    email: string;
    phone: string;
    website: string;
    hours: string;
    address: string;
  };
  ai: {
    title: string;
    desc: string;
    geminiKey: string;
    groqKey: string;
    saveKeys: string;
    keysSaved: string;
    eraseKeys: string;
    keysErased: string;
    keysNeverLeave: string;
    genEmail: string;
    genScript: string;
    generating: string;
    selectLead: string;
    copy: string;
    creditError: string;
  };
  credits: { left: string; byokPrompt: string };
  trust: { title: string; body: string; selfHost: string; clone: string };
};

const CATEGORY_SUGGESTIONS = [
  "plumber",
  "electrician",
  "bakery",
  "dentist",
  "restaurant",
  "cafe",
  "gym",
  "pharmacy",
  "hairdresser",
  "auto repair",
  "lawyer",
  "accountant",
  "veterinary",
  "beauty salon",
];

function LeadSearch({
  dict,
  status,
  onSearch,
}: {
  dict: DemoDict;
  status: "idle" | "searching" | "done" | "error";
  onSearch: (params: SearchParams) => void;
}) {
  const [category, setCategory] = React.useState("dentist");
  const [city, setCity] = React.useState("Milan");
  const [radiusKm, setRadiusKm] = React.useState("10");
  const s = dict.search;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !city.trim() || status === "searching") return;
    onSearch({ category: category.trim(), city: city.trim(), radiusKm: Number(radiusKm) });
  };

  return (
    <form onSubmit={submit} className="card-hover space-y-4 rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur sm:p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-indigo-500" />
        <h2 className="text-sm font-semibold tracking-tight sm:text-base">{s.title}</h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-category">{s.categoryLabel}</Label>
        <Input
          id="demo-category"
          list="demo-category-suggestions"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={s.categoryPlaceholder}
          required
        />
        <datalist id="demo-category-suggestions">
          {CATEGORY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="demo-city">{s.cityLabel}</Label>
          <Input
            id="demo-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={s.cityPlaceholder}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>{s.radiusLabel}</Label>
          <Select value={radiusKm} onValueChange={setRadiusKm}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["5", "10", "25", "50"].map((km) => (
                <SelectItem key={km} value={km}>
                  {km} km
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={status === "searching"}>
        {status === "searching" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {s.searching}
          </>
        ) : (
          <>
            <SearchIcon className="h-4 w-4" />
            {s.search}
          </>
        )}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground">
        Powered by OpenStreetMap Â· Nominatim Â· Overpass
      </p>
    </form>
  );
}

function scoreVariant(score: number) {
  if (score >= 70) return "success" as const;
  if (score >= 40) return "warning" as const;
  return "outline" as const;
}

function LeadResults({
  dict,
  leads,
  status,
  selected,
  onSelect,
}: {
  dict: DemoDict;
  leads: Lead[];
  status: "idle" | "searching" | "done" | "error";
  selected: Lead | null;
  onSelect: (lead: Lead) => void;
}) {
  const s = dict.search;
  const l = dict.lead;

  if (status === "searching") {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {s.searching}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-6 text-center">
        <Sparkles className="h-6 w-6 text-amber-500" />
        <p className="text-sm text-muted-foreground">{s.error}</p>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/40 p-6 text-center">
        <SearchIcon className="h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{s.noResults}</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-6 text-center">
        <Sparkles className="h-6 w-6 text-indigo-400" />
        <p className="text-sm text-muted-foreground">{s.noResults}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="px-1 text-xs font-medium text-muted-foreground">
        {leads.length} {s.results}
      </p>
      {leads.map((lead) => (
        <button
          key={lead.id}
          type="button"
          onClick={() => onSelect(lead)}
          className={`w-full rounded-2xl border p-4 text-left transition ${
            selected?.id === lead.id
              ? "border-indigo-500/70 bg-indigo-500/5 ring-2 ring-indigo-500/20"
              : "border-border/60 bg-card/70 hover:border-indigo-500/40 hover:bg-card"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold tracking-tight">{lead.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {lead.category}
                {lead.address ? ` Â· ${lead.address}` : ""}
              </p>
            </div>
            <Badge variant={scoreVariant(lead.score)}>{lead.score}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {lead.distanceKm !== undefined && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {lead.distanceKm.toFixed(1)} {s.distance}
              </span>
            )}
            {lead.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </span>
            )}
            {lead.website && (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {l.website}
              </span>
            )}
            {lead.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {l.email}
              </span>
            )}
            {lead.hours && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {l.hours}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

const CLONE_COMMAND = GITHUB_CLONE;

function TrustBar({ dict }: { dict: DemoDict }) {
  const addToast = useToast();
  const [copied, setCopied] = React.useState(false);
  const trust = dict.trust;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CLONE_COMMAND);
    } catch {
      return;
    }
    setCopied(true);
    addToast({ title: dict.ai.copy, variant: "success" });
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="card-hover rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur sm:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <h2 className="text-sm font-semibold tracking-tight sm:text-base">{trust.title}</h2>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{trust.body}</p>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-2.5">
        <TerminalSquare className="h-4 w-4 shrink-0 text-indigo-500" />
        <code className="flex-1 truncate font-mono text-xs text-foreground/90">
          {CLONE_COMMAND}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={trust.selfHost}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full"
        asChild
      >
        <a
          href="${GITHUB_REPO}"
          target="_blank"
          rel="noreferrer"
        >
          <Github className="h-4 w-4" />
          {trust.selfHost}
        </a>
      </Button>
    </div>
  );
}

function AiPanel({
  dict,
  lead,
}: {
  dict: DemoDict;
  lead: Lead | null;
}) {
  const addToast = useToast();
  const locale = useLocale();
  const [geminiKey, setGeminiKey] = React.useState("");
  const [groqKey, setGroqKey] = React.useState("");
  const [savedKeys, setSavedKeys] = React.useState<{ gemini?: string; groq?: string }>({});
  const [credits, setCredits] = React.useState(10);
  const [generating, setGenerating] = React.useState<"email" | "script" | null>(null);
  const [output, setOutput] = React.useState("");
  const ai = dict.ai;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = localStorage.getItem("lm_demo_credits");
      const initial = raw ? Math.max(0, Math.min(10, Number(raw) || 0)) : 10;
      if (!cancelled) setCredits(initial);
      const stored = await loadByokKeysLocal();
      if (!cancelled) {
        setSavedKeys({
          gemini: stored.gemini_api_key,
          groq: stored.groq_api_key,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateCredits = (next: number) => {
    const clamped = Math.max(0, Math.min(10, next));
    setCredits(clamped);
    localStorage.setItem("lm_demo_credits", String(clamped));
  };

  const saveKeys = async () => {
    await storeByokKeysLocal({
      gemini_api_key: geminiKey.trim() || undefined,
      groq_api_key: groqKey.trim() || undefined,
    });
    setSavedKeys({ gemini: geminiKey.trim(), groq: groqKey.trim() });
    setGeminiKey("");
    setGroqKey("");
    addToast({ title: ai.keysSaved, variant: "success" });
  };

  const eraseKeys = () => {
    clearByokKeysLocal();
    setSavedKeys({});
    addToast({ title: ai.keysErased });
  };

  const buildPrompt = (kind: "email" | "script"): string => {
    const lines = [
      `Business name: ${lead?.name ?? ""}`,
      `Category: ${lead?.category ?? ""}`,
      `Address: ${lead?.address ?? ""}`,
      ...(lead?.phone ? [`Phone: ${lead.phone}`] : []),
      ...(lead?.website ? [`Website: ${lead.website}`] : []),
      ...(lead?.email ? [`Email: ${lead.email}`] : []),
      ...(lead?.hours ? [`Opening hours: ${lead.hours}`] : []),
    ].join("\n");

    if (kind === "email") {
      return `You are an expert in cold outreach for B2B sales. Write a short, friendly cold email (max 120 words) in ${locale} to this business:\n\n${lines}\n\nRules: no spammy language, reference their actual business, end with one clear call-to-action (a 15-minute call). Output only the email body, no subject line and no preamble.`;
    }
    return `You are a sales trainer. Write a natural 12-line telephone call script in ${locale} for this business:\n\n${lines}\n\nStart with a greeting, include a hook, two open questions, and a clear close asking for an appointment. Output only the script, numbered lines 1-12.`;
  };

  const handleGenerate = async (kind: "email" | "script") => {
    if (!lead) {
      addToast({ title: ai.selectLead, variant: "warning" });
      return;
    }
    const prompt = buildPrompt(kind);
    setGenerating(kind);
    setOutput("");
    try {
      const byokKey = savedKeys.gemini || savedKeys.groq;
      if (byokKey) {
        const provider = savedKeys.gemini ? "gemini" : "groq";
        const text = await callProvider(provider, prompt, byokKey);
        setOutput(text);
        return;
      }
      const demo = await callDemoAi(prompt);
      if (demo.notConfigured) {
        addToast({ title: ai.creditError, variant: "destructive" });
        return;
      }
      if (demo.error === "quota" || (demo.remaining !== undefined && demo.remaining === 0)) {
        updateCredits(0);
        addToast({ title: ai.creditError, variant: "warning" });
        return;
      }
      if (!demo.text) {
        addToast({ title: ai.creditError, variant: "destructive" });
        return;
      }
      if (demo.remaining !== undefined) updateCredits(demo.remaining);
      else updateCredits(credits - 1);
      setOutput(demo.text);
    } catch (err) {
      addToast({
        title: err instanceof Error ? err.message : ai.creditError,
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const copyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      return;
    }
    addToast({ title: ai.copy, variant: "success" });
  };

  return (
    <div className="card-hover space-y-4 rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fuchsia-500" />
          <h2 className="text-sm font-semibold tracking-tight sm:text-base">{ai.title}</h2>
        </div>
        <Badge variant="success">
          {dict.credits.left.replace("{count}", String(credits))}
        </Badge>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">{ai.desc}</p>

      <div className="space-y-2">
        <Label htmlFor="demo-gemini-key">{ai.geminiKey}</Label>
        <Input
          id="demo-gemini-key"
          type="password"
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
          placeholder="AIza..."
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-groq-key">{ai.groqKey}</Label>
        <Input
          id="demo-groq-key"
          type="password"
          value={groqKey}
          onChange={(e) => setGroqKey(e.target.value)}
          placeholder="gsk_..."
          autoComplete="off"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={saveKeys}>
          {ai.saveKeys}
        </Button>
        {(savedKeys.gemini || savedKeys.groq) && (
          <Button variant="ghost" size="sm" onClick={eraseKeys}>
            {ai.eraseKeys}
          </Button>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">{ai.keysNeverLeave}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="gradient"
          size="sm"
          disabled={generating !== null}
          onClick={() => handleGenerate("email")}
        >
          {generating === "email" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {ai.genEmail}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={generating !== null}
          onClick={() => handleGenerate("script")}
        >
          {generating === "script" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          {ai.genScript}
        </Button>
      </div>

      {credits === 0 && (
        <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
          {dict.credits.byokPrompt}
        </p>
      )}

      {output && (
        <div className="space-y-2">
          <div className="relative rounded-xl border border-border/60 bg-muted/50 p-4">
            <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
              {output}
            </pre>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={copyOutput}>
            <Copy className="h-4 w-4" />
            {ai.copy}
          </Button>
        </div>
      )}
    </div>
  );
}

export function DemoApp({ dict }: { dict: DemoDict }) {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [status, setStatus] = React.useState<"idle" | "searching" | "done" | "error">("idle");
  const [selected, setSelected] = React.useState<Lead | null>(null);

  const handleSearch = async (params: SearchParams) => {
    setStatus("searching");
    setLeads([]);
    setSelected(null);
    try {
      const results = await searchLeads(params);
      setLeads(results);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="relative">
      <section className="relative overflow-hidden pt-20 pb-10 sm:pt-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/20" />
        </div>
        <div className="container">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <Badge variant="gradient" className="px-3 py-1">LIVE</Badge>
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              {dict.title}
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">{dict.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <LeadSearch dict={dict} status={status} onSearch={handleSearch} />
              <LeadResults
                dict={dict}
                leads={leads}
                status={status}
                selected={selected}
                onSelect={setSelected}
              />
            </div>
            <div className="space-y-6 lg:col-span-2">
              <AiPanel dict={dict} lead={selected} />
              <TrustBar dict={dict} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
