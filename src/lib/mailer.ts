// Invio email reale via SMTP (es. Gmail con "Password per le app", gratis).
// La configurazione viene letta PRIMA dalle Impostazioni (database) e POI
// dal file .env come ripiego, cosi puoi configurare tutto dalla UI.

import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSettings } from "@/lib/settings";

function clean(v: string | undefined | null): string {
  return (v ?? "").trim().replace(/^[\"']|[\"']$/g, "").trim();
}

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export async function getSmtpConfig(): Promise<SmtpConfig> {
  let s: Record<string, string> = {};
  try {
    s = await getSettings();
  } catch {
    s = {};
  }
  const host = clean(s.smtp_host) || clean(process.env.SMTP_HOST);
  const portRaw = clean(s.smtp_port) || clean(process.env.SMTP_PORT) || "587";
  const port = Number(portRaw) || 587;
  const user = clean(s.smtp_user) || clean(process.env.SMTP_USER);
  const pass = clean(s.smtp_pass) || clean(process.env.SMTP_PASS);
  const from = clean(s.smtp_from) || clean(process.env.SMTP_FROM) || user;
  return { host, port, user, pass, from };
}

// true se host, utente e password sono presenti (DB o .env).
export async function smtpConfigured(): Promise<boolean> {
  const c = await getSmtpConfig();
  return Boolean(c.host && c.user && c.pass);
}

export type EmailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
};

function isCloudflareRuntime(): boolean {
  return process.env.CLOUDFLARE_WORKERS === "1" || process.env.DATABASE_PROVIDER === "d1";
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: true; messageId: string; provider: string; file?: string }> {
  const c = await getSmtpConfig();
  if (!input.to) {
    throw new Error("Manca l'indirizzo email del destinatario.");
  }

  // Fallback sicuro: senza SMTP scriviamo un file .eml in ./tmp/emails.
  // Cosi demo, sviluppo e test non richiedono credenziali e non inviano nulla.
  // Su Workers non esiste un filesystem scrivibile: meglio un errore chiaro
  // che un 500 opaco. Per inviare email online configura SMTP in Impostazioni.
  if (!c.host || !c.user || !c.pass) {
    if (isCloudflareRuntime()) {
      throw new Error(
        "SMTP non configurato. Su Cloudflare il fallback .eml non è disponibile: configura host, utente e password SMTP in Impostazioni."
      );
    }
    const transporter = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: "unix",
    });
    const info = await transporter.sendMail({
      from: c.from || c.user || "Lead Machine <noreply@localhost>",
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    });
    const raw = Buffer.isBuffer(info.message)
      ? info.message
      : Buffer.from(String(info.message ?? ""));
    const dir = path.join(process.cwd(), "tmp", "emails");
    await mkdir(dir, { recursive: true });
    const filename = new Date().toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 8) + ".eml";
    const filePath = path.join(dir, filename);
    await writeFile(filePath, raw);
    return {
      ok: true,
      messageId: String(info.messageId ?? filename),
      provider: "local-fs",
      file: path.relative(process.cwd(), filePath),
    };
  }

  const secure = c.port === 465;
  const transporter = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure,
    auth: { user: c.user, pass: c.pass },
  });

  const info = await transporter.sendMail({
    from: c.from || c.user,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.attachments,
  });

  return { ok: true, messageId: String(info.messageId ?? ""), provider: c.host };
}
