// Dati personali di un lead: esportazione (portabilita') e cancellazione
// (diritto all'oblio).
//
// Perche' non basta `prisma.lead.delete()`: Appointment ed EmailLog hanno
// `onDelete: SetNull`, quindi cancellare il lead lascerebbe righe con nome,
// email, oggetto e corpo della mail. Una cancellazione "GDPR" che lascia quei
// dati non e' una cancellazione. Qui vengono rimossi esplicitamente, nella
// stessa transazione del lead.
import { prisma } from "@/lib/prisma";

/**
 * Confronto della conferma digitata dall'utente con il nome del lead.
 * Volutamente esatto (a meno di spazi esterni e maiuscole/minuscole non
 * normalizzate oltre il trim): la conferma deve essere un gesto deliberato,
 * non un `confirm: true` che si puo' inviare per sbaglio.
 */
export function isEraseConfirmationValid(leadName: string, provided: unknown): boolean {
  if (typeof provided !== "string") return false;
  const expected = leadName.trim();
  if (!expected) return false;
  return provided.trim() === expected;
}

/** Tutto cio' che riguarda il lead, in un'unica fotografia esportabile. */
export async function getLeadExport(leadId: string) {
  return prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      locations: true,
      tags: true,
      activities: { orderBy: { createdAt: "asc" } },
      followUps: true,
      appointments: true,
      messages: true,
      receipts: true,
      verifications: true,
      retryQueue: true,
      emailLogs: true,
    },
  });
}

export type LeadExport = NonNullable<Awaited<ReturnType<typeof getLeadExport>>>;

export type EraseCounts = {
  lead: number;
  locations: number;
  tagLinks: number;
  activities: number;
  followUps: number;
  appointments: number;
  messages: number;
  receipts: number;
  verifications: number;
  retryQueue: number;
  emailLogs: number;
};

/**
 * Cancella il lead e TUTTI i dati collegati.
 * Ritorna quante righe sono state rimosse per tabella, cosi' la risposta e il
 * test possono verificare che non sia rimasto nulla (in particolare le due
 * tabelle con SetNull).
 */
export async function eraseLeadData(leadId: string): Promise<EraseCounts> {
  const counts = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      _count: {
        select: {
          locations: true,
          tags: true,
          activities: true,
          followUps: true,
          appointments: true,
          messages: true,
          receipts: true,
          verifications: true,
          retryQueue: true,
          emailLogs: true,
        },
      },
    },
  });

  if (!counts) {
    throw new Error("Lead non trovato");
  }

  const [appointments, emailLogs, lead] = await prisma.$transaction([
    // Le relazioni con Cascade le rimuove il database insieme al lead; queste
    // due no, e vanno cancellate prima (dopo il lead non avrebbero piu' il
    // collegamento e resterebbero dati personali orfani).
    prisma.appointment.deleteMany({ where: { leadId } }),
    prisma.emailLog.deleteMany({ where: { leadId } }),
    prisma.lead.delete({ where: { id: leadId } }),
  ]);

  return {
    lead: lead ? 1 : 0,
    locations: counts._count.locations,
    // I tag sono condivisi fra lead: qui si rimuovono solo i collegamenti.
    tagLinks: counts._count.tags,
    activities: counts._count.activities,
    followUps: counts._count.followUps,
    appointments: appointments.count,
    messages: counts._count.messages,
    receipts: counts._count.receipts,
    verifications: counts._count.verifications,
    retryQueue: counts._count.retryQueue,
    emailLogs: emailLogs.count,
  };
}
