import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/notifications -> ultime notifiche + conteggio non lette
export async function GET() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { read: false } });
  return NextResponse.json({ notifications, unreadCount });
}

// PATCH /api/notifications  body: { markAllRead: true } -> segna tutte come lette
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.markAllRead) {
    await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Azione non valida" }, { status: 400 });
}

// DELETE /api/notifications -> elimina tutte le notifiche gia lette
export async function DELETE() {
  await prisma.notification.deleteMany({ where: { read: true } });
  return NextResponse.json({ ok: true });
}
