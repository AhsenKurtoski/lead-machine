import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkWebsite } from "@/lib/website-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/leads/[id]/enrich -> verifica lo stato reale del sito del lead
export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = (await context.params).id;
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }

  const check = await checkWebsite(lead.website);

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      websiteStatus: check.status,
      hasWebsite: check.status !== "assente" && Boolean(lead.website),
    },
  });

  await prisma.activity.create({
    data: { leadId: id, type: "sistema", description: "Verifica sito: " + check.detail },
  });

  return NextResponse.json({ ok: true, websiteStatus: updated.websiteStatus, check });
}
