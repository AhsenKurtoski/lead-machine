#!/usr/bin/env node
// Verifica che l'invio email funzioni DENTRO workerd, non solo su Node.
//
// Perche' esiste: `nodemailer` usa `node:net` e `node:tls`. Con
// `nodejs_compat` funzionano, ma questa compatibilita' puo' cambiare con un
// bump di Wrangler o di workerd e il solo `next build` non lo scoprirebbe.
// Qui il Worker VERO (wrangler dev) apre un socket TCP verso un server SMTP
// locale, si autentica, consegna il messaggio e noi controlliamo:
//   - il messaggio arrivato al server (destinatario, oggetto, corpo);
//   - la riga EmailLog salvata con stato INVIATO;
//   - il passaggio del lead da NUOVO a CONTATTATO.
//
// Non usa credenziali esterne e non manda nulla a internet: tutto su
// 127.0.0.1. Va eseguito con il Worker gia' avviato (la CI lo fa nello stesso
// job dello smoke D1).
//
// Uso:
//   WORKER_URL=http://127.0.0.1:8799 APP_PASSWORD=... node scripts/check-email-worker.mjs

import net from "node:net";

const BASE = (process.env.WORKER_URL || "http://127.0.0.1:8799").replace(/\/$/, "");
const PASSWORD = process.env.APP_PASSWORD || "";
const SMTP_PORT = Number(process.env.SMTP_TEST_PORT || 2530);
const TO = "destinatario-worker@example.test";
const NAME = "Cliente SMTP workerd " + Date.now();
const SUBJECT = "Prova SMTP su workerd " + Date.now();
const BODY = "Messaggio inviato dal Worker vero, non da Node.";

let failures = 0;
function record(label, ok, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures += 1;
}

/** Server SMTP minimale: registra AUTH e i messaggi ricevuti. */
function startSink(port) {
  const state = { messages: [], auth: 0, errors: [] };
  const server = net.createServer((sock) => {
    let buffer = "";
    let data = "";
    let inData = false;
    let authStep = 0;
    const send = (line) => sock.write(line + "\r\n");

    send("220 sink.local ESMTP");
    sock.on("error", (error) => state.errors.push(error.code || error.message));
    sock.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let index;
      while ((index = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);

        if (inData) {
          if (line === ".") {
            inData = false;
            state.messages.push(data);
            data = "";
            send("250 2.0.0 queued as sink-1");
          } else {
            data += line + "\n";
          }
          continue;
        }

        const upper = line.toUpperCase();
        if (authStep === 1) {
          authStep = 2;
          send("334 UGFzc3dvcmQ6");
          continue;
        }
        if (authStep === 2) {
          authStep = 0;
          state.auth += 1;
          send("235 2.7.0 auth ok");
          continue;
        }
        if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
          sock.write("250-sink.local\r\n250-AUTH PLAIN LOGIN\r\n250-8BITMIME\r\n250 SIZE 52428800\r\n");
        } else if (upper.startsWith("AUTH PLAIN")) {
          state.auth += 1;
          send("235 2.7.0 auth ok");
        } else if (upper === "AUTH LOGIN") {
          authStep = 1;
          send("334 VXNlcm5hbWU6");
        } else if (upper.startsWith("MAIL FROM") || upper.startsWith("RCPT TO") || upper === "RSET" || upper === "NOOP") {
          send("250 2.1.0 ok");
        } else if (upper === "DATA") {
          inData = true;
          send("354 end with .");
        } else if (upper === "QUIT") {
          send("221 bye");
          sock.end();
        } else {
          // Qualsiasi altro comando (STARTTLS, HELP...) non deve bloccare il test.
          send("250 2.0.0 ok");
        }
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve({ server, state }));
  });
}

async function login() {
  const response = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const cookie = (response.headers.get("set-cookie") || "").split(";")[0];
  return { status: response.status, cookie };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!PASSWORD) {
    console.error("APP_PASSWORD mancante: impossibile autenticarsi al Worker.");
    process.exit(2);
  }
  console.log(`Worker: ${BASE} — sink SMTP locale sulla porta ${SMTP_PORT}`);

  const { server, state } = await startSink(SMTP_PORT);
  let cookie = "";
  let leadId = null;

  try {
    const auth = await login();
    cookie = auth.cookie;
    record("login al Worker", auth.status === 200, `HTTP ${auth.status}`);
    if (auth.status !== 200 || !cookie) throw new Error("login fallito");

    const api = (path, init = {}) =>
      fetch(BASE + path, {
        ...init,
        headers: { cookie, "content-type": "application/json", ...(init.headers || {}) },
      });

    const settings = await api("/api/settings", {
      method: "POST",
      body: JSON.stringify({
        settings: {
          smtp_host: "127.0.0.1",
          smtp_port: String(SMTP_PORT),
          smtp_user: "worker@test.local",
          smtp_pass: "password-solo-per-il-test",
          smtp_from: "Lead Machine <worker@test.local>",
        },
      }),
    });
    const settingsBody = await settings.json().catch(() => ({}));
    record(
      "SMTP di prova accettato dalle Impostazioni",
      settings.status === 200 && settingsBody.updated === 5,
      `HTTP ${settings.status}, aggiornate ${settingsBody.updated ?? "?"}`
    );

    const created = await api("/api/leads", {
      method: "POST",
      body: JSON.stringify({ candidates: [{ name: NAME, email: TO, city: "Milano", category: "test" }] }),
    });
    const leads = await api("/api/leads?q=" + encodeURIComponent(NAME));
    const lead = ((await leads.json().catch(() => ({}))).leads || []).find((item) => item.name === NAME);
    leadId = lead?.id ?? null;
    record("lead di prova creato", created.status === 200 && Boolean(leadId), `HTTP ${created.status}, id ${leadId ?? "assente"}`);

    const sent = await api("/api/email/send", {
      method: "POST",
      body: JSON.stringify({ leadId, subject: SUBJECT, body: BODY }),
    });
    const sentBody = await sent.json().catch(() => ({}));
    record(
      "il Worker consegna la mail al server SMTP",
      sent.status === 200 && sentBody.ok === true && sentBody.provider === "127.0.0.1",
      `HTTP ${sent.status}, provider ${sentBody.provider ?? "assente"}`
    );

    for (let i = 0; i < 20 && state.messages.length === 0; i += 1) await sleep(250);
    const message = state.messages[0] || "";
    record("il server SMTP ha ricevuto un messaggio", state.messages.length === 1, `${state.messages.length} messaggi`);
    record("il client si e' autenticato (AUTH)", state.auth > 0, `${state.auth} AUTH`);
    record("destinatario corretto", message.includes("To: " + TO), TO);
    record("oggetto corretto", message.includes("Subject: " + SUBJECT), SUBJECT);
    record("corpo corretto", message.includes(BODY), BODY.slice(0, 40));

    const logs = await api("/api/email/logs?q=" + encodeURIComponent(SUBJECT.slice(0, 20)));
    const logRows = (await logs.json().catch(() => ({}))).logs || [];
    const row = logRows.find((item) => item.subject === SUBJECT);
    record(
      "EmailLog salvata con stato INVIATO",
      row?.status === "INVIATO" && row?.toEmail === TO,
      row ? `${row.status} -> ${row.toEmail}` : "nessuna riga"
    );

    const after = await api(`/api/leads/${leadId}`);
    const afterBody = await after.json().catch(() => ({}));
    record("il lead e' passato a CONTATTATO", afterBody.lead?.status === "CONTATTATO", afterBody.lead?.status || "?");
  } finally {
    if (leadId) {
      try {
        const deleted = await fetch(BASE + `/api/leads/${leadId}`, { method: "DELETE", headers: { cookie } });
        console.log(`  PULIZIA  lead ${leadId}: HTTP ${deleted.status}`);
      } catch (error) {
        console.error(`  PULIZIA FALLITA (lead): ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    server.close();
  }

  if (failures > 0) {
    console.error(`\nInvio email su workerd: ${failures} controlli falliti.`);
    process.exit(1);
  }
  console.log("\nInvio email su workerd: tutti i controlli superati.");
}

main().catch((error) => {
  console.error("Errore durante il controllo:", error instanceof Error ? error.message : error);
  process.exit(1);
});
