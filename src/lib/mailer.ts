// Invio email reale via SMTP (es. Gmail con "Password per le app", gratis).
// La configurazione viene letta PRIMA dalle Impostazioni (database) e POI
// dal file .env come ripiego, cosi puoi configurare tutto dalla UI.

import nodemailer from "nodemailer";
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

export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: true; messageId: string; provider: string }> {
  const c = await getSmtpConfig();
  if (!c.host || !c.user || !c.pass) {
    throw new Error(
      "Invio email non configurato. Vai in Impostazioni > Email e inserisci server, utente e password (per Gmail una Password per le app).",
    );
  }
  if (!input.to) {
    throw new Error("Manca l'indirizzo email del destinatario.");
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
