import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/activities -> log attivita (filtri opzionali ?type= e ?leadId=)
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const leadId = req.nextUrl.searchParams.get("leadId");
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (leadId) where.leadId = leadId;
  const activities = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { lead: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ activities });
}
