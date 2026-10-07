import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED = ["INVIATO", "RISPOSTO", "ACCETTATO", "RIFIUTATO", "RIMBALZATO"];

const LABELS: Record<string, string> = {
  RISPOSTO: "Il cliente ha risposto all'email",
  ACCETTATO: "Proposta accettata via email",
  RIFIUTATO: "Proposta rifiutata via email",
  RIMBALZATO: "Email rimbalzata (indirizzo non valido)",
  INVIATO: "Stato email riportato a 'inviata'",
};

// PATCH /api/email/logs/[id]  body: { status?, hasReply? }
// Aggiorna lo stato dell'email e tiene allineato lo stato del lead.
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await req.json().catch(() => ({}));
  const log = await prisma.emailLog.findUnique({ where: { id: params.id } });
  if (!log) {
    return NextResponse.json({ ok: false, error: "Email non trovata" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  let newStatus = log.status;
  let statusChanged = false;

  if (typeof body.status === "string" && ALLOWED.includes(body.status)) {
    newStatus = body.status;
    data.status = body.status;
    statusChanged = true;
    if (["RISPOSTO", "ACCETTATO", "RIFIUTATO"].includes(body.status)) {
      data.hasReply = true;
      if (!log.repliedAt) data.repliedAt = new Date();
    }
    if (body.status === "INVIATO" || body.status === "RIMBALZATO") {
      if (body.hasReply === undefined) {
        data.hasReply = false;
        data.repliedAt = null;
      }
    }
  }

  if (typeof body.hasReply === "boolean") {
    data.hasReply = body.hasReply;
    if (body.hasReply && !log.repliedAt) data.repliedAt = new Date();
    if (!body.hasReply) data.repliedAt = null;
  }

  const updated = await prisma.emailLog.update({ where: { id: params.id }, data });

  // Storico nel diario del lead + notifica + aggiornamento stato lead.
  if (log.leadId && statusChanged) {
    await prisma.activity.create({
      data: {
        leadId: log.leadId,
        type: "email",
        description: (LABELS[newStatus] || "Stato email aggiornato") + " - " + log.toEmail,
      },
    });
    if (newStatus === "ACCETTATO") {
      await prisma.lead.update({ where: { id: log.leadId }, data: { status: "CLIENTE" } });
    } else if (newStatus === "RISPOSTO") {
      await prisma.lead.update({ where: { id: log.leadId }, data: { status: "IN_TRATTATIVA" } });
    }
    await prisma.notification.create({
      data: {
        type: "risposta",
        title: LABELS[newStatus] || "Stato email aggiornato",
        message: log.toName || log.toEmail,
        link: "/email",
      },
    });
  }

  return NextResponse.json({ ok: true, log: updated });
}

// DELETE /api/email/logs/[id]  - rimuove la voce dal registro email.
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await prisma.emailLog.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
