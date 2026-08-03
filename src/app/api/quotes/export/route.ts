import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quoteTotalFromRaw } from "@/lib/quotes";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// GET /api/quotes/export -> scarica tutti i preventivi in formato CSV
export async function GET() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    include: { lead: { select: { name: true } } },
  });

  const header = ["Numero", "Cliente", "Titolo", "Stato", "Totale EUR", "Acconto %", "Data", "Valido fino al"];
  const lines = quotes.map((q) => {
    const total = quoteTotalFromRaw(q.items, q.discount, q.taxRate);
    return [
      csvCell(q.number),
      csvCell(q.lead?.name ?? ""),
      csvCell(q.title ?? ""),
      csvCell(q.status),
      csvCell(total.toFixed(2)),
      csvCell(q.depositPercent ?? 0),
      csvCell(new Date(q.createdAt).toLocaleDateString("it-IT")),
      csvCell(q.validUntil ? new Date(q.validUntil).toLocaleDateString("it-IT") : ""),
    ].join(",");
  });

  const csv = "\ufeff" + [header.join(","), ...lines].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="preventivi.csv"',
    },
  });
}
