import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, asString, asInt, asBoolean, asArray } from "@/lib/security";

export const dynamic = "force-dynamic";

// GET /api/backup -> scarica un backup JSON completo di tutte le tabelle.
export async function GET(req: Request) {
  const rl = await rateLimitedResponse(req, "backup:export", 10, 60_000);
  if (rl) return rl;

  try {
    const [
      leads,
      locations,
      tags,
      activities,
      followUps,
      appointments,
      messageTemplates,
      generatedMessages,
      notifications,
      settings,
      quotes,
    ] = await Promise.all([
      prisma.lead.findMany(),
      prisma.location.findMany(),
      prisma.tag.findMany(),
      prisma.activity.findMany(),
      prisma.followUp.findMany(),
      prisma.appointment.findMany(),
      prisma.messageTemplate.findMany(),
      prisma.generatedMessage.findMany(),
      prisma.notification.findMany(),
      prisma.setting.findMany(),
      prisma.quote.findMany(),
    ]);

    const safeSettings = settings.map((s) => {
      if (s.key.endsWith("_api_key") || s.key.endsWith("_pass")) {
        return { ...s, value: s.value ? "••••••••" : "" };
      }
      return s;
    });
    const redactedQuotes = quotes.map((q) => ({ ...q, internalNotes: q.internalNotes ? "[REDACTED]" : "" }));

    const backup = {
      app: "lead-machine",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        leads,
        locations,
        tags,
        activities,
        followUps,
        appointments,
        messageTemplates,
        generatedMessages,
        notifications,
        settings: safeSettings,
        quotes: redactedQuotes,
      },
    };

    const filename = "backup-lead-machine-" + new Date().toISOString().slice(0, 10) + ".json";
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Errore backup" }, { status: 500 });
  }
}
