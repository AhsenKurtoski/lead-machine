"use client";

import * as React from "react";
import Link from "next/link";
import { parseCsv } from "@/lib/csv";

import { CATEGORIES } from "@/lib/categories";
import { toast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  priorityColor,
  cn,
  statusLabel,
} from "@/lib/utils";
import {
  Loader2,
  Trash2,
  XCircle,
  CheckCircle2,
  ChevronRight,
  Users,
  Download,
  Upload,
} from "lucide-react";

const STATUSES = Object.keys(STATUS_LABELS);

type Tag = { id: string; name: string; color: string };
type Lead = {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  status: string;
  hasWebsite: boolean;
  hasSocial: boolean;
  priorityScore: number;
  city: string | null;
  phone: string | null;
  email: string | null;
  tags: Tag[];
};

export default function CrmPage() {
  const { t } = useLocale();
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [onlyNoWeb, setOnlyNoWeb] = React.useState(false);
  const [bulkStatus, setBulkStatus] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);


  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (onlyNoWeb) params.set("onlyNoWeb", "1");
    const res = await fetch("/api/leads?" + params.toString());
    const data = await res.json();
    setLeads(data.leads ?? []);
    setSelected(new Set());
    setLoading(false);
  }, [q, statusFilter, categoryFilter, onlyNoWeb]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(id: string, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch("/api/leads/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map((l) => l.id)));
  }

  async function bulkApply() {
    if (selected.size === 0 || !bulkStatus) return;
    await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action: "status", status: bulkStatus }),
    });
    setBulkStatus("");
    load();
  }

  async function confirmBulkDelete() {
    if (selected.size === 0) return;
    try {
      const res = await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action: "delete" }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: t("toast.deletedTitle"),
          description: t("toast.deletedDesc"),
          variant: "success",
        });
        load();
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
        description: t("toast.networkDesc"),
        variant: "destructive",
      });
    }
  }

  // Esporta tutti i lead in CSV (compatibile Excel) tramite la route /api/leads/export.
  function exportCsv() {
    window.open("/api/leads/export", "_blank");
  }

  // Importa lead da un file CSV (es. esportato da Excel). Salta nomi vuoti e duplicati.
  async function importCsv(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: t("toast.importDoneTitle"),
          description: t("toast.importDoneDesc", { created: data.created ?? 0, skipped: data.skipped ?? 0 }),
          variant: "success",
        });
        load();
      } else {
        toast({
          title: t("toast.importErrorTitle"),
          description: data.error || t("toast.importErrorDesc"),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("toast.csvInvalidTitle"),
        description: t("toast.csvInvalidDesc"),
        variant: "destructive",
      });
    }
    setImporting(false);
  }

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importCsv(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1 h-4 w-4" />
          )}
          Importa CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1 h-4 w-4" />
          Esporta CSV
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
          <p className="text-muted-foreground">{leads.length} lead in pipeline</p>
        </div>
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Input
            placeholder="Cerca per nome..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tutti gli stati</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          <select className={selectClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">Tutte le categorie</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={onlyNoWeb}
              onChange={(e) => setOnlyNoWeb(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Solo senza sito
          </label>
        </CardContent>
      </Card>

      {/* Barra azioni massive */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 animate-fade-in">
          <span className="text-sm font-medium">{selected.size} selezionati</span>
          <select className={selectClass} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
            <option value="">Cambia stato in...</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          <Button size="sm" onClick={bulkApply} disabled={!bulkStatus}>
            Applica
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" /> Elimina
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("confirm.leadsTitle")}
        description={t("confirm.leadsDesc", { n: selected.size })}
        confirmText={t("confirm.leadsAction")}
        cancelText={t("confirm.cancel")}
        variant="destructive"
        onConfirm={confirmBulkDelete}
      />

      {/* Tabella */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
              <Users className="h-10 w-10 opacity-40" />
              <p>Nessun lead. Vai su "Ricerca lead" per trovarne e salvarli qui.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="w-10 p-3">
                      <input
                        type="checkbox"
                        checked={selected.size === leads.length && leads.length > 0}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-input"
                      />
                    </th>
                    <th className="p-3">Attivita</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Stato</th>
                    <th className="p-3">Web</th>
                    <th className="p-3">Social</th>
                    <th className="p-3 text-right">Prio.</th>
                    <th className="w-10 p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-accent/50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(l.id)}
                          onChange={() => toggle(l.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                      </td>
                      <td className="p-3">
                        <Link href={"/crm/" + l.id} className="font-medium hover:text-primary">
                          {l.name}
                        </Link>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(l.tags ?? []).map((t) => (
                            <span
                              key={t.id}
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                              style={tagStyle(t.color)}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">{l.subcategory ?? l.category ?? "-"}</Badge>
                      </td>
                      <td className="p-3">
                        <select
                          className={cn(selectClass, "h-8")}
                          value={l.status}
                          onChange={(e) => changeStatus(l.id, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{statusLabel(s)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        {l.hasWebsite ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="p-3">
                        {l.hasSocial ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className={cn("font-bold tabular-nums", priorityColor(l.priorityScore))}>
                          {l.priorityScore}
                        </span>
                      </td>
                      <td className="p-3">
                        <Link href={"/crm/" + l.id} className="text-muted-foreground hover:text-foreground">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function tagStyle(color: string): React.CSSProperties {
  return { backgroundColor: color };
}
