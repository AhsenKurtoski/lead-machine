import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitedResponse, asString } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  // Playwright and the filesystem are not available in a Worker. Fail with a
  // clear 501 before touching the database or the URL validator.
  if (process.env.CLOUDFLARE_WORKERS === "1") {
    return NextResponse.json(
      {
        ok: false,
        needsInstall: true,
        error:
          "Gli screenshot dei siti non sono disponibili su Cloudflare Workers. Usa l'installazione locale per questa funzione.",
      },
      { status: 501 }
    );
  }

  // Carica Playwright e il validatore URL solo nell'installazione locale:
  // gli import statici farebbero fallire il modulo della route sul Worker.
  const [{ captureWebsite }, { assertPublicHttpUrl }] = await Promise.all([
    import("@/lib/screenshot"),
    import("@/lib/url-safety"),
  ]);

  const rl = await rateLimitedResponse(req, "screenshot:capture", 15, 60000);
  if (rl) return rl;

  const body = await req.json().catch(() => null);
  const leadId = asString(body?.leadId, 100) || "";

  if (!leadId) {
    return NextResponse.json({ ok: false, error: "leadId obbligatorio" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead non trovato" }, { status: 404 });
  }
  if (!lead.website) {
    return NextResponse.json({ ok: false, error: "Questo lead non ha un sito web." }, { status: 400 });
  }

  // Non accettiamo un URL arbitrario dal client: lo screenshot deve riguardare
  // il sito salvato sul lead. Altrimenti la route diventa un browser SSRF.
  try {
    await assertPublicHttpUrl(lead.website);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "URL del sito non valido" },
      { status: 400 }
    );
  }

  const result = await captureWebsite(lead.website, leadId);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.needsInstall ? 501 : 500 });
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { websiteScreenshot: result.publicPath },
  });
  await prisma.activity.create({
    data: { leadId, type: "sistema", description: "Screenshot del sito catturato" },
  });

  return NextResponse.json({ ok: true, screenshot: result.publicPath });
}
