"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScreenshotCard } from "@/components/screenshot-card";
import { WebsiteCheckCard } from "@/components/website-check-card";
import { LeadWebActions } from "@/components/lead-web-actions";
import { fillTemplate, buildWaLink, buildMailto } from "@/lib/templates";
import {
  STATUS_LABELS,
  priorityColor,
  formatDate,
  cn,
  statusLabel,
} from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  MessageCircle,
  MapPin,
  Trash2,
  Save,
  X,
  Plus,
  Clock,
  Sparkles,
  Send,
  Copy,
  FileText,
} from "lucide-react";

const STATUSES = Object.keys(STATUS_LABELS);

type Activity = { id: string; type: string; description: string; createdAt: string };
type Tag = { id: string; name: string; color: string };
type Template = { id: string; name: string; channel: string; subject: string | null; body: string; isDefault: boolean };
type Lead = {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  status: string;
  priorityScore: number;
  priorityReason: string | null;
  addressFull: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  websiteStatus: string | null;
  websiteScreenshot: string | null;
  demoPrompt: string | null;
  hasWebsite: boolean;
  hasSocial: boolean;
  instagram: string | null;
  facebook: string | null;
  notes: string | null;
  tags: Tag[];
  activities: Activity[];
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [lead, setLead] = React.useState<Lead | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notes, setNotes] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [newTag, setNewTag] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedMsg, setSavedMsg] = React.useState(false);

  // Contatto / messaggi
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [templateId, setTemplateId] = React.useState("");
  const [msgSubject, setMsgSubject] = React.useState("");
  const [msgBody, setMsgBody] = React.useState("");
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [sendMsg, setSendMsg] = React.useState<string | null>(null);
  const [aiUsed, setAiUsed] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiNote, setAiNote] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/leads/" + id);
    const data = await res.json();
    if (data.ok) {
      setLead(data.lead);
      setNotes(data.lead.notes ?? "");
      setTags((data.lead.tags ?? []).map((t: Tag) => t.name));
    }
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Carica template + impostazioni una volta sola
  React.useEffect(() => {
    (async () => {
      const [tr, sr] = await Promise.all([
        fetch("/api/templates").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
      ]);
      setTemplates(tr.templates ?? []);
      setSettings(sr.settings ?? {});
    })();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  // Quando cambio template (o ho lead+settings), compilo l'anteprima
  React.useEffect(() => {
    if (!selectedTemplate || !lead) return;
    setMsgBody(fillTemplate(selectedTemplate.body, lead, settings));
    setMsgSubject(selectedTemplate.subject ? fillTemplate(selectedTemplate.subject, lead, settings) : "");
    setAiUsed(false);
    setAiNote(null);
  }, [templateId, lead, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch("/api/leads/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) setLead(data.lead);
    return data;
  }

  async function saveAll() {
    setSaving(true);
    await patch({ notes, tags });
    await load();
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  async function changeStatus(status: string) {
    await patch({ status });
    await load();
  }

  function addTag() {
    const t = newTag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setNewTag("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  async function del() {
    if (!confirm("Eliminare definitivamente questo lead?")) return;
    await fetch("/api/leads/" + id, { method: "DELETE" });
    router.push("/crm");
  }

  async function personalizeAI() {
    if (!selectedTemplate || !lead) return;
    setAiLoading(true);
    setAiNote(null);
    const res = await fetch("/api/ai/personalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, baseText: msgBody, channel: selectedTemplate.channel }),
    });
    const data = await res.json();
    if (data.ok) {
      setMsgBody(data.text);
      setAiUsed(Boolean(data.aiUsed));
      if (data.note) setAiNote(data.note);
    }
    setAiLoading(false);
  }

  async function logMessage(channel: string, waLink: string | null) {
    if (!lead) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        channel,
        subject: channel === "email" ? msgSubject : null,
        body: msgBody,
        waLink,
        aiUsed,
      }),
    });
    await load();
  }

  async function openWhatsApp() {
    if (!lead) return;
    const link = buildWaLink(lead.whatsapp, msgBody);
    if (!link) return;
    window.open(link, "_blank");
    await logMessage("whatsapp", link);
  }

  async function openEmail() {
    if (!lead) return;
    const link = buildMailto(lead.email, msgSubject, msgBody);
    if (!link) return;
    window.location.href = link;
    await logMessage("email", null);
  }

  async function sendEmailNow() {
    if (!lead || !lead.email) return;
    setSendingEmail(true);
    setSendMsg(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, subject: msgSubject, body: msgBody, aiUsed }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Errore durante l'invio");
      setSendMsg("Email inviata a " + lead.email + " \u2713");
      await load();
    } catch (e) {
      setSendMsg(e instanceof Error ? e.message : "Errore durante l'invio dell'email");
    } finally {
      setSendingEmail(false);
    }
  }

  function copyBody() {
    navigator.clipboard?.writeText(msgBody);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!lead) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Lead non trovato. <Link href="/crm" className="text-primary underline">Torna al CRM</Link>
      </div>
    );
  }

  const waLink = lead.whatsapp ? "https://wa.me/" + lead.whatsapp : null;
  const channel = selectedTemplate?.channel ?? "whatsapp";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/crm" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Torna al CRM
        </Link>
        <Button variant="destructive" size="sm" onClick={del}>
          <Trash2 className="h-4 w-4" /> Elimina
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{lead.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{lead.subcategory ?? lead.category ?? "-"}</Badge>
            {lead.addressFull && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {lead.addressFull}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Priorita</p>
          <p className={cn("text-4xl font-bold tabular-nums", priorityColor(lead.priorityScore))}>
            {lead.priorityScore}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <LeadWebActions leadId={lead.id} website={lead.website} initialPrompt={lead.demoPrompt} />
        <Link href={"/preventivi?lead=" + lead.id}>
          <Button variant="outline" size="sm">
            <FileText className="mr-1 h-4 w-4" /> Crea preventivo
          </Button>
        </Link>
        <Link href={"/calendario?lead=" + lead.id}>
          <Button variant="outline" size="sm">
            <Clock className="mr-1 h-4 w-4" /> Programma follow-up
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonna sinistra */}
        <div className="space-y-6 lg:col-span-2">
          {/* Stato */}
          <Card>
            <CardHeader><CardTitle className="text-base">Stato pipeline</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    lead.status === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  )}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Contatta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contatta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Template</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <option value="">Scegli un template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {(t.channel === "email" ? "[Email] " : "[WhatsApp] ") + t.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <>
                  {channel === "email" && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Oggetto</label>
                      <Input value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Messaggio</label>
                    <Textarea rows={6} value={msgBody} onChange={(e) => setMsgBody(e.target.value)} />
                  </div>

                  {aiNote && <p className="text-xs text-amber-600 dark:text-amber-400">{aiNote}</p>}
                  {aiUsed && <p className="text-xs text-emerald-600">Testo migliorato con AI.</p>}
                  {sendMsg && <p className="text-xs text-blue-600 dark:text-blue-400">{sendMsg}</p>}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={personalizeAI} disabled={aiLoading}>
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Personalizza con AI
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyBody}>
                      <Copy className="h-4 w-4" /> Copia
                    </Button>

                    {channel === "email" ? (
                      <>
                        <Button size="sm" onClick={sendEmailNow} disabled={!lead.email || sendingEmail}>
                          {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Invia email ora
                        </Button>
                        <Button variant="outline" size="sm" onClick={openEmail} disabled={!lead.email}>
                          <Mail className="h-4 w-4" /> Apri nel client
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={openWhatsApp} disabled={!lead.whatsapp}>
                        <Send className="h-4 w-4" /> Apri in WhatsApp
                      </Button>
                    )}
                  </div>
                  {channel !== "email" && !lead.whatsapp && (
                    <p className="text-xs text-muted-foreground">Nessun numero WhatsApp disponibile per questo lead.</p>
                  )}
                  {channel === "email" && !lead.email && (
                    <p className="text-xs text-muted-foreground">Nessuna email disponibile per questo lead.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Contatti */}
          <Card>
            <CardHeader><CardTitle className="text-base">Contatti</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <ContactRow icon={Phone} label="Telefono" value={lead.phone} href={lead.phone ? "tel:" + lead.phone : null} />
              <ContactRow icon={MessageCircle} label="WhatsApp" value={lead.whatsapp} href={waLink} />
              <ContactRow icon={Mail} label="Email" value={lead.email} href={lead.email ? "mailto:" + lead.email : null} />
              <ContactRow icon={Globe} label="Sito web" value={lead.website ?? "Assente"} href={lead.website} />
              <ContactRow icon={Instagram} label="Instagram" value={lead.instagram ?? "-"} href={lead.instagram} />
              <ContactRow icon={Facebook} label="Facebook" value={lead.facebook ?? "-"} href={lead.facebook} />
            </CardContent>
          </Card>

          {/* Sito web: stato + screenshot */}
          {lead.website ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Sito web</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <WebsiteCheckCard
                  leadId={lead.id}
                  website={lead.website}
                  initialStatus={lead.websiteStatus}
                />
                <ScreenshotCard
                  leadId={lead.id}
                  website={lead.website}
                  initialScreenshot={lead.websiteScreenshot}
                />
              </CardContent>
            </Card>
          ) : null}

          {/* Note */}
          <Card>
            <CardHeader><CardTitle className="text-base">Note</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Appunti, contesto, esito chiamate..."
                rows={4}
              />
              <div>
                <p className="mb-2 text-sm font-medium">Etichette</p>
                <div className="flex flex-wrap items-center gap-2">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTag()}
                      placeholder="Aggiungi tag"
                      className="h-8 w-32"
                    />
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={saveAll} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salva
                </Button>
                {savedMsg && <span className="text-sm text-emerald-600">Salvato!</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonna destra */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Perche questa priorita</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{lead.priorityReason ?? "Nessuna motivazione registrata."}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Storico attivita</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(lead.activities ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nessuna attivita registrata.</p>
              )}
              {(lead.activities ?? []).map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="mt-0.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  href?: string | null;
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value || "-"}</p>
      </div>
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="transition-colors hover:bg-accent rounded-lg">
        {content}
      </a>
    );
  }
  return content;
}
