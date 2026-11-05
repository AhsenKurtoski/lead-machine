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
      receipts,
      verifications,
      verificationRetries,
      emailLogs,
      apiKeys,
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
      prisma.receipt.findMany(),
      prisma.verification.findMany(),
      prisma.verificationRetry.findMany(),
      prisma.emailLog.findMany(),
      prisma.apiKey.findMany({
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          enabled: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const safeSettings = settings.map((s) => {
      if (s.key.endsWith("_api_key") || s.key.endsWith("_pass")) {
        return { ...s, value: s.value ? "••••••••" : "" };
      }
      return s;
    });
    const exportedReceipts = receipts;

    const backup = {
      app: "lead-machine",
      version: 2,
      exportedAt: new Date().toISOString(),
      note: "Export dei dati. Non contiene chiavi API in chiaro ne password. Il ripristino automatico non e implementato.",
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
        receipts: exportedReceipts,
        verifications,
        verificationRetries,
        emailLogs,
        apiKeys,
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
