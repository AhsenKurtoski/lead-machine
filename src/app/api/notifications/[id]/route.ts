import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/notifications/[id]  body: { read?: boolean } -> aggiorna stato letto
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = (await context.params).id;
  const body = await req.json().catch(() => ({}));
  const notification = await prisma.notification.update({
    where: { id },
    data: { read: body.read ?? true },
  });
  return NextResponse.json({ notification });
}

// DELETE /api/notifications/[id] -> elimina una notifica
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const id = (await context.params).id;
  await prisma.notification.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
