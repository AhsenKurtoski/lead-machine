import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Converte una data in formato iCalendar UTC: 20260612T103000Z
function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Esegue l'escape dei caratteri speciali nel testo iCalendar.
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId");
  const appointments = await prisma.appointment.findMany({
    where: leadId ? { leadId } : {},
    include: { lead: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lead Machine Contributors//Lead Machine Open Source//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const a of appointments) {
    const start = new Date(a.startsAt);
    const end = a.endsAt ? new Date(a.endsAt) : new Date(start.getTime() + 60 * 60000);
    const title = a.lead?.name ? a.title + " - " + a.lead.name : a.title;
    lines.push(
      "BEGIN:VEVENT",
      "UID:appt-" + a.id + "@lead-machine.local",
      "DTSTAMP:" + toIcsDate(new Date(a.createdAt)),
      "DTSTART:" + toIcsDate(start),
      "DTEND:" + toIcsDate(end),
      "SUMMARY:" + esc(title),
    );
    if (a.notes) lines.push("DESCRIPTION:" + esc(a.notes));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  const body = lines.join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lead-machine-calendar.ics"',
    },
  });
}
