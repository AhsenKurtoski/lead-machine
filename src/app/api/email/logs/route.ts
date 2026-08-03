import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/email/logs?status=...&q=...
// Elenco delle email inviate con destinatario, stato ed eventuale risposta.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "").trim();
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  const where: Record<string, unknown> = {};
  if (status && status !== "TUTTI") {
    if (status === "IN_ATTESA") {
      where.hasReply = false;
      where.status = "INVIATO";
    } else if (status === "RISPOSTE") {
      where.hasReply = true;
    } else {
      where.status = status;
    }
  }

  const logs = await prisma.emailLog.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 500,
    include: { lead: { select: { id: true, name: true, status: true } } },
  });

  const filtered = q
    ? logs.filter(
        (l) =>
          l.toEmail.toLowerCase().includes(q) ||
          (l.toName || "").toLowerCase().includes(q) ||
          (l.subject || "").toLowerCase().includes(q),
      )
    : logs;

  // Riepilogo per le statistiche in cima alla pagina.
  const all = await prisma.emailLog.findMany({ select: { status: true, hasReply: true } });
  const summary = {
    totali: all.length,
    inviate: all.filter((l) => l.status === "INVIATO" && !l.hasReply).length,
    risposte: all.filter((l) => l.hasReply).length,
    accettate: all.filter((l) => l.status === "ACCETTATO").length,
    rifiutate: all.filter((l) => l.status === "RIFIUTATO").length,
    rimbalzate: all.filter((l) => l.status === "RIMBALZATO").length,
  };

  return NextResponse.json({ ok: true, logs: filtered, summary });
}
