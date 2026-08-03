import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";

// GET /api/ai/status -> stato (non sensibile) delle chiavi AI configurate.
export async function GET() {
  const status = await aiStatus();
  return NextResponse.json(status);
}
