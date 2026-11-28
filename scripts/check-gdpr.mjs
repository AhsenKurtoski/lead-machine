#!/usr/bin/env node
// Verifica GDPR su dati temporanei veri, contro un server in esecuzione.
//
// Crea due lead (uno da cancellare, uno di controllo), aggiunge dati collegati
// veri — appuntamento, ricevuta, EmailLog, verifica — poi:
//   1. esporta il lead e controlla che ci sia tutto e che non ci sia il lead
//      di controllo;
//   2. prova conferme sbagliate (vuota, booleana, nome diverso) e verifica che
//      il lead resti intatto;
//   3. cancella con il nome esatto e controlla OGNI tabella collegata, in
//      particolare Appointment ed EmailLog che nello schema sono SetNull;
//   4. verifica che il lead di controllo e i suoi dati siano ancora intatti;
//   5. ripulisce quello che resta.
//
// Uso:
//   APP_PASSWORD=... node scripts/check-gdpr.mjs
//   BASE_URL=http://127.0.0.1:3111 APP_PASSWORD=... node scripts/check-gdpr.mjs

import { PrismaClient } from "@prisma/client";

const BASE = (process.env.BASE_URL || process.env.SMOKE_BASE || "http://127.0.0.1:3111").replace(/\/$/, "");
const PASSWORD = process.env.APP_PASSWORD || process.env.SMOKE_PASSWORD || "";
const prisma = new PrismaClient();

const suffix = Date.now().toString(36);
const primaryName = `GDPR Test ${suffix}`;
const primaryEmail = `gdpr-${suffix}@example.test`;
const primaryPhone = "+39 333 000 0001";
const controlName = `GDPR Controllo ${suffix}`;
const controlEmail = `gdpr-controllo-${suffix}@example.test`;
const emailSubject = `Email GDPR ${suffix}`;

let failures = 0;
function record(label, ok, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures += 1;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!PASSWORD) {
    console.error("APP_PASSWORD mancante.");
    process.exit(2);
  }
  console.log(`Server: ${BASE}`);

  const login = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  record("login", login.status === 200 && Boolean(cookie), `HTTP ${login.status}`);
  if (login.status !== 200) process.exit(1);

  const api = (path, init = {}) =>
    fetch(BASE + path, {
      ...init,
      headers: { cookie, "content-type": "application/json", ...(init.headers || {}) },
    });

  const createLead = async (name, email, phone) => {
    const response = await api("/api/leads", {
      method: "POST",
      body: JSON.stringify({ candidates: [{ name, email, phone, city: "Feltre", category: "test" }] }),
    });
    if (response.status !== 200) return null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const list = await api("/api/leads?q=" + encodeURIComponent(name));
      const lead = ((await list.json().catch(() => ({}))).leads || []).find((item) => item.name === name);
      if (lead) return lead;
      await sleep(100);
    }
    return null;
  };

  const primary = await createLead(primaryName, primaryEmail, primaryPhone);
  const control = await createLead(controlName, controlEmail, null);
  record("lead principale creato", Boolean(primary), primary?.id || "assente");
  record("lead di controllo creato", Boolean(control), control?.id || "assente");
  if (!primary || !control) throw new Error("impossibile creare i lead di prova");

  const appointment = await api("/api/appointments", {
    method: "POST",
    body: JSON.stringify({
      leadId: primary.id,
      title: "Sopralluogo GDPR " + suffix,
      startsAt: new Date(Date.now() + 3_600_000).toISOString(),
      notes: "Nota personale da cancellare",
    }),
  });
  record("appuntamento collegato creato", appointment.status === 200, `HTTP ${appointment.status}`);

  const receipt = await api("/api/receipts", {
    method: "POST",
    body: JSON.stringify({ leadId: primary.id, amount: 12.34, description: "Acconto GDPR", method: "contanti" }),
  });
  const receiptBody = await receipt.json().catch(() => ({}));
  const receiptNumber = receiptBody.receipt?.number ?? null;
  record("ricevuta collegata creata", receipt.status === 201 && Boolean(receiptNumber), receiptNumber || `HTTP ${receipt.status}`);

  // EmailLog e Verification non hanno un endpoint di creazione (le email
  // nascono dall'invio, le verifiche dal runner): le inseriamo nel database
  // vero, cosi' la cancellazione deve rimuoverle davvero.
  const emailLog = await prisma.emailLog.create({
    data: {
      leadId: primary.id,
      toEmail: primaryEmail,
      toName: primaryName,
      subject: emailSubject,
      body: "Corpo della email con dati personali.",
      status: "INVIATO",
      source: "singola",
    },
  });
  await prisma.verification.create({
    data: { leadId: primary.id, field: "email", status: "verificato", source: "controllo_diretto" },
  });
  await prisma.followUp.create({
    data: { leadId: primary.id, dueDate: new Date(Date.now() + 86_400_000), note: "Richiamare", done: false },
  });
  const controlEmailLog = await prisma.emailLog.create({
    data: { leadId: control.id, toEmail: controlEmail, toName: controlName, subject: "Controllo " + suffix, status: "INVIATO" },
  });
  const controlReceipt = await api("/api/receipts", {
    method: "POST",
    body: JSON.stringify({ leadId: control.id, amount: 99, description: "Ricevuta di controllo", method: "contanti" }),
  });
  record("dati collegati inseriti", Boolean(emailLog.id) && controlReceipt.status === 201);

  // --- Export -------------------------------------------------------------
  const exported = await api(`/api/leads/${primary.id}/export`);
  const exportText = await exported.text();
  let exportBody = {};
  try {
    exportBody = JSON.parse(exportText);
  } catch {
    exportBody = {};
  }
  const data = exportBody.lead || {};
  record("export: HTTP 200 JSON", exported.status === 200 && exportBody.format === "lead-machine-gdpr-export-v1", `HTTP ${exported.status}`);
  record(
    "export: intestazioni di download e no-store",
    /application\/json/.test(exported.headers.get("content-type") || "") &&
      /attachment; filename="lead-.+-export\.json"/.test(exported.headers.get("content-disposition") || "") &&
      /no-store/.test(exported.headers.get("cache-control") || ""),
    `${exported.headers.get("content-disposition") || "disposition assente"} | ${exported.headers.get("cache-control") || "cache assente"}`
  );
  record("export: anagrafica completa", data.name === primaryName && data.email === primaryEmail && data.phone === primaryPhone, `${data.name || "?"} / ${data.email || "?"}`);
  record("export: appuntamento incluso", (data.appointments || []).some((row) => row.title.startsWith("Sopralluogo GDPR")), `${(data.appointments || []).length} appuntamenti`);
  record("export: ricevuta inclusa", (data.receipts || []).some((row) => row.number === receiptNumber), `${(data.receipts || []).length} ricevute`);
  record("export: email log inclusa", (data.emailLogs || []).some((row) => row.subject === emailSubject), `${(data.emailLogs || []).length} log`);
  record("export: verifica inclusa", (data.verifications || []).some((row) => row.field === "email"), `${(data.verifications || []).length} verifiche`);
  record("export: follow-up incluso", (data.followUps || []).length >= 1, `${(data.followUps || []).length} follow-up`);
  record("export: attivita inclusa", (data.activities || []).length >= 2, `${(data.activities || []).length} attivita`);
  record("export: nessun dato del lead di controllo", !exportText.includes(controlEmail) && !exportText.includes(controlName));

  const notFoundExport = await api(`/api/leads/${primary.id}-inesistente/export`);
  record("export di un lead inesistente: 404", notFoundExport.status === 404, `HTTP ${notFoundExport.status}`);

  // --- Conferma esplicita -------------------------------------------------
  const attempts = [
    ["conferma assente", {}],
    ["conferma booleana", { confirm: true }],
    ["nome di un altro lead", { confirm: controlName }],
    ["nome parziale", { confirm: primaryName.split(" ")[0] }],
  ];
  for (const [label, payload] of attempts) {
    const response = await api(`/api/leads/${primary.id}/erase`, { method: "POST", body: JSON.stringify(payload) });
    record(`cancellazione rifiutata: ${label}`, response.status === 400, `HTTP ${response.status}`);
  }
  const stillThere = await api(`/api/leads/${primary.id}`);
  record("dopo i tentativi rifiutati il lead esiste ancora", stillThere.status === 200, `HTTP ${stillThere.status}`);

  // --- Cancellazione ------------------------------------------------------
  const erased = await api(`/api/leads/${primary.id}/erase`, {
    method: "POST",
    body: JSON.stringify({ confirm: primaryName }),
  });
  const erasedBody = await erased.json().catch(() => ({}));
  record("cancellazione con il nome esatto", erased.status === 200 && erasedBody.ok === true, `HTTP ${erased.status}`);
  const counts = erasedBody.deleted || {};
  record(
    "la risposta elenca le righe rimosse",
    counts.lead === 1 && counts.appointments >= 1 && counts.emailLogs === 1 && counts.receipts === 1 && counts.verifications === 1 && counts.followUps === 1,
    JSON.stringify(counts)
  );

  const after = await api(`/api/leads/${primary.id}`);
  const afterExport = await api(`/api/leads/${primary.id}/export`);
  record("il lead non esiste piu'", after.status === 404, `HTTP ${after.status}`);
  record("l'export non trova piu' il lead", afterExport.status === 404, `HTTP ${afterExport.status}`);

  const leftovers = {
    lead: await prisma.lead.count({ where: { id: primary.id } }),
    locations: await prisma.location.count({ where: { leadId: primary.id } }),
    activities: await prisma.activity.count({ where: { leadId: primary.id } }),
    followUps: await prisma.followUp.count({ where: { leadId: primary.id } }),
    appointments: await prisma.appointment.count({ where: { leadId: primary.id } }),
    messages: await prisma.generatedMessage.count({ where: { leadId: primary.id } }),
    receipts: await prisma.receipt.count({ where: { leadId: primary.id } }),
    verifications: await prisma.verification.count({ where: { leadId: primary.id } }),
    retryQueue: await prisma.verificationRetry.count({ where: { leadId: primary.id } }),
    emailLogs: await prisma.emailLog.count({ where: { leadId: primary.id } }),
    emailLogsByAddress: await prisma.emailLog.count({ where: { toEmail: primaryEmail } }),
    appointmentsByTitle: await prisma.appointment.count({ where: { title: "Sopralluogo GDPR " + suffix } }),
    receiptsByNumber: await prisma.receipt.count({ where: { number: receiptNumber } }),
  };
  record(
    "nessuna riga residua in nessuna tabella collegata",
    Object.values(leftovers).every((value) => value === 0),
    JSON.stringify(leftovers)
  );

  const controlAfter = await api(`/api/leads/${control.id}/export`);
  const controlBody = await controlAfter.json().catch(() => ({}));
  record(
    "il lead di controllo e i suoi dati sono intatti",
    controlAfter.status === 200 &&
      controlBody.lead?.email === controlEmail &&
      (controlBody.lead?.receipts || []).length === 1 &&
      (controlBody.lead?.emailLogs || []).some((row) => row.id === controlEmailLog.id),
    `HTTP ${controlAfter.status}`
  );

  // --- Pulizia ------------------------------------------------------------
  const controlErased = await api(`/api/leads/${control.id}/erase`, {
    method: "POST",
    body: JSON.stringify({ confirm: controlName }),
  });
  record("pulizia del lead di controllo", controlErased.status === 200, `HTTP ${controlErased.status}`);
  if (controlErased.status !== 200) {
    await api(`/api/leads/${control.id}`, { method: "DELETE" });
  }

  // Se la cancellazione ha funzionato non resta nulla; questi delete sono una
  // rete di sicurezza per non lasciare dati dietro se un controllo fallisce.
  await prisma.emailLog.deleteMany({ where: { toEmail: { in: [primaryEmail, controlEmail] } } });
  await prisma.appointment.deleteMany({ where: { title: "Sopralluogo GDPR " + suffix } });
}

main()
  .catch((error) => {
    console.error("Errore durante il controllo:", error instanceof Error ? error.message : error);
    failures += 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (failures > 0) {
      console.error(`\nGDPR: ${failures} controlli falliti.`);
      process.exit(1);
    }
    console.log("\nGDPR: tutti i controlli superati.");
  });
