import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  authConfigured,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";
import { rateLimitedResponse, asString } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = await rateLimitedResponse(req, "auth:login", 10, 60_000);
  if (limited) return limited;

  if (!authConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "APP_PASSWORD non configurata. Imposta una password di almeno 8 caratteri nel file .env e riavvia l'app.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = asString(body?.password, 500) ?? "";
  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ ok: false, error: "Password non corretta." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
