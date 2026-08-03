import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toCsv, LEAD_CSV_COLUMNS } from "@/lib/csv";

export const dynamic = "force-dynamic";

// GET /api/leads/export -> scarica tutti i lead in CSV (compatibile Excel)
export async function GET() {
  const leads = await prisma.lead.findMany({ orderBy: { priorityScore: "desc" } });
  const csv = toCsv(leads as Array<Record<string, unknown>>, LEAD_CSV_COLUMNS);
  const filename = "lead-feltre-" + new Date().toISOString().slice(0, 10) + ".csv";
  // BOM iniziale per far riconoscere UTF-8 a Excel
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
    },
  });
}
