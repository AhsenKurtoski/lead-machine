"use client";

import * as React from "react";
import { Mail, MessageCircle, Copy, Check } from "lucide-react";
import { buildMailto, buildWaLink } from "@/lib/templates";

const STATUSES: { key: string; label: string }[] = [
  { key: "inviato", label: "Inviato" },
  { key: "accettato", label: "Accettato" },
  { key: "rifiutato", label: "Rifiutato" },
];

// Azioni di invio del preventivo: WhatsApp e Email aprono il client del
// dispositivo con il testo gia pronto (nessuna configurazione SMTP necessaria).
// "Copia testo" copia il preventivo negli appunti. I pulsanti di stato
// aggiornano lo stato del preventivo nel CRM.
export function QuoteSendActions(props: {
  quoteId: string;
  email: string | null;
  whatsapp: string | null;
  emailSubject: string;
  emailBody: string;
  waBody: string;
  initialStatus: string;
}) {
  const [status, setStatus] = React.useState(props.initialStatus);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const mailto = buildMailto(props.email, props.emailSubject, props.emailBody);
  const wa = buildWaLink(props.whatsapp, props.waBody);

  async function patchStatus(next: string) {
    setStatus(next);
    setMsg(null);
    try {
      await fetch("/api/quotes/" + props.quoteId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setMsg("Stato aggiornato.");
    } catch {
      setMsg("Impossibile aggiornare lo stato.");
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(props.emailBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setMsg("Copia non disponibile su questo browser.");
    }
  }

  return (
    <div className="no-print flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            onClick={() => patchStatus("inviato")}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        ) : null}
        {mailto ? (
          <a
            href={mailto}
            onClick={() => patchStatus("inviato")}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Mail className="h-4 w-4" /> Email
          </a>
        ) : null}
        <button
          onClick={copyText}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiato" : "Copia testo"}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
        <span className="text-zinc-500">Stato:</span>
        {STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => patchStatus(s.key)}
            className={
              "rounded-full border px-2.5 py-1 transition-colors " +
              (status === s.key
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50")
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {!wa && !mailto ? (
        <span className="text-xs text-zinc-500">
          Nessun contatto email/telefono per questo lead.
        </span>
      ) : null}
      {msg ? <span className="text-xs text-emerald-600">{msg}</span> : null}
    </div>
  );
}
