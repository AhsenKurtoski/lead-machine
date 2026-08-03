import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Crea automaticamente un promemoria di ricontatto per i lead che sono fermi:
// status CONTATTATO o IN_TRATTATIVA, non aggiornati da piu di 3 giorni e senza
// un follow-up gia in sospeso. Cosi non perdi nessun lead caldo.
export async function POST() {
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000);

  const leads = await prisma.lead.findMany({
    where: {
      status: { in: ["CONTATTATO", "IN_TRATTATIVA"] },
      updatedAt: { lt: threeDaysAgo },
    },
    select: { id: true, name: true },
  });

  let created = 0;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  for (const lead of leads) {
    const pending = await prisma.followUp.findFirst({
      where: { leadId: lead.id, done: false },
      select: { id: true },
    });
    if (pending) continue;

    await prisma.followUp.create({
      data: {
        leadId: lead.id,
        dueDate: tomorrow,
        channel: "chiamata",
        note: "Promemoria automatico: ricontatta questo lead, e fermo da qualche giorno.",
      },
    });
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        type: "sistema",
        description: "Creato promemoria automatico di ricontatto.",
      },
    });
    created += 1;
  }

  if (created > 0) {
    await prisma.notification.create({
      data: {
        type: "follow_up",
        title: "Promemoria automatici creati",
        message: "Sono stati generati " + created + " nuovi promemoria di ricontatto.",
        link: "/calendario",
      },
    });
  }

  return Response.json({ ok: true, created, scanned: leads.length });
}
