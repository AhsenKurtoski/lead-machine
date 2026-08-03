"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TEMPLATE_VARIABLES } from "@/lib/templates";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  MessageCircle,
  Mail,
  Star,
  Send,
  Zap,
  Globe,
  RefreshCw,
} from "lucide-react";

type Template = {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  isDefault: boolean;
};

const EMPTY = { id: "", name: "", channel: "whatsapp", subject: "", body: "", isDefault: false };

export default function MessaggiPage() {
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState({ ...EMPTY });
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [bulkPreview, setBulkPreview] = React.useState<{ conSito: number; senzaSito: number; total: number } | null>(null);
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [bulkSending, setBulkSending] = React.useState(false);
  const [bulkResult, setBulkResult] = React.useState<string | null>(null);
  const [onlyNew, setOnlyNew] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data.templates ?? []);
    setLoading(false);
  }, []);

  const loadBulkPreview = React.useCallback(async () => {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/email/bulk");
      const data = await res.json();
      if (data.ok) {
        setBulkPreview({ conSito: data.conSito, senzaSito: data.senzaSito, total: data.total });
      } else {
        setBulkResult(data.error || "Errore nel calcolo dei lead.");
      }
    } catch {
      setBulkResult("Impossibile calcolare i lead idonei.");
    } finally {
      setBulkLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    loadBulkPreview();
  }, [load, loadBulkPreview]);

  function startNew() {
    setForm({ ...EMPTY });
    setEditing(true);
  }

  function startEdit(t: Template) {
    setForm({
      id: t.id,
      name: t.name,
      channel: t.channel,
      subject: t.subject ?? "",
      body: t.body,
      isDefault: t.isDefault,
    });
    setEditing(true);
  }

  async function save() {
    if (!form.name || !form.body) return;
    setSaving(true);
    const payload = {
      name: form.name,
      channel: form.channel,
      subject: form.channel === "email" ? form.subject : null,
      body: form.body,
      isDefault: form.isDefault,
    };
    if (form.id) {
      await fetch("/api/templates/" + form.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setEditing(false);
    setForm({ ...EMPTY });
    load();
  }

  async function del(id: string) {
    if (!confirm("Eliminare questo template?")) return;
    await fetch("/api/templates/" + id, { method: "DELETE" });
    load();
  }

  function insertVar(v: string) {
    setForm((f) => ({ ...f, body: f.body + " " + v }));
  }

  async function sendBulk() {
    const count = bulkPreview?.total ?? 0;
    if (count === 0) return;
    if (
      !confirm(
        "Inviare l'email automatica a " +
          count +
          " lead? A chi ha gia un sito verra proposto un restyling a pochi euro, a chi non ce l'ha la creazione di un nuovo sito.",
      )
    )
      return;
    setBulkSending(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/email/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyNeverEmailed: onlyNew }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Errore durante l'invio");
      let msg =
        "Inviate " +
        data.sent +
        " email (" +
        data.conSito +
        " proposta restyling, " +
        data.senzaSito +
        " proposta nuovo sito).";
      if (data.failed) msg += " Non riuscite: " + data.failed + ".";
      if (data.remaining) msg += " Rimangono " + data.remaining + " lead (rilancia per continuare).";
      setBulkResult(msg);
      loadBulkPreview();
    } catch (e) {
      setBulkResult(e instanceof Error ? e.message : "Errore durante l'invio massivo");
    } finally {
      setBulkSending(false);
    }
  }

  const selectClass =
    "h-10 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messaggi & Template</h1>
          <p className="text-muted-foreground">
            Modelli riutilizzabili per WhatsApp ed Email, con variabili compilate in automatico.
          </p>
        </div>
        {!editing && (
          <Button onClick={startNew}>
            <Plus className="h-4 w-4" /> Nuovo template
          </Button>
        )}
      </div>

      {/* Invio automatico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" /> Invio automatico email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manda in automatico l'email su misura a tutti i lead con indirizzo email: a chi{" "}
            <strong>ha gia un sito</strong> proponi un restyling a pochi euro, a chi{" "}
            <strong>non ha un sito</strong> proponi un nuovo sito. Il testo giusto viene scelto da solo.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1">
              <Globe className="h-3.5 w-3.5" /> Con sito: <strong>{bulkPreview?.conSito ?? "-"}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1">
              <Mail className="h-3.5 w-3.5" /> Senza sito: <strong>{bulkPreview?.senzaSito ?? "-"}</strong>
            </span>
            <Button variant="ghost" size="sm" onClick={loadBulkPreview} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Aggiorna
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyNew}
              onChange={(e) => setOnlyNew(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Invia solo ai lead mai contattati via email
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={sendBulk} disabled={bulkSending || (bulkPreview?.total ?? 0) === 0}>
              {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Invia ora a {bulkPreview?.total ?? 0} lead
            </Button>
            <span className="text-xs text-muted-foreground">
              Richiede l'email configurata in Impostazioni.
            </span>
          </div>
          {bulkResult && (
            <p className="text-sm text-blue-600 dark:text-blue-400">{bulkResult}</p>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {form.id ? "Modifica template" : "Nuovo template"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Es. WhatsApp - Primo contatto"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Canale</Label>
                <select
                  className={selectClass + " w-full"}
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            {form.channel === "email" && (
              <div className="space-y-1.5">
                <Label>Oggetto email</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Oggetto con variabili, es. Una bozza di sito per [nome]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Testo del messaggio</Label>
              <Textarea
                rows={7}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Scrivi il messaggio usando le variabili qui sotto..."
              />
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                Clicca per inserire una variabile (verra sostituita coi dati reali del lead):
              </p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVar(v)}
                    className="rounded-md border border-input px-2 py-1 font-mono text-xs hover:bg-accent"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Template predefinito per questo canale
            </label>

            <div className="flex gap-3">
              <Button onClick={save} disabled={saving || !form.name || !form.body}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salva
              </Button>
              <Button variant="outline" onClick={() => { setEditing(false); setForm({ ...EMPTY }); }}>
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {t.channel === "email" ? (
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                    )}
                    <CardTitle className="text-base">{t.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{t.channel === "email" ? "Email" : "WhatsApp"}</Badge>
                    {t.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                        <Star className="h-3 w-3 fill-amber-500" /> Predefinito
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => del(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {t.subject && (
                  <p className="mb-1 text-sm font-medium">Oggetto: {t.subject}</p>
                )}
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
