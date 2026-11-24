// scripts/test-flows.mjs
// Test di interazione sui flussi chiave, contro un server gia' avviato:
//   1. dati del lead (creazione, validazione, modifica, verifica reale);
//   2. import CSV (righe valide, duplicati, righe scartate, sanificazione);
//   3. ricevute di pagamento (numerazione, importi, modifica, cancellazione);
//   4. azioni massive (cambio stato, eliminazione con propagazione).
//
// Uso:
//   SMOKE_BASE=http://localhost:3111 SMOKE_PASSWORD=... node scripts/test-flows.mjs
//
// Il server deve avere APP_PASSWORD configurata: gli endpoint interni
// falliscono chiusi senza sessione. Lo script ripulisce da solo i lead che ha
// creato (anche dopo una run interrotta), cosi' `check:hygiene --require-db`
// resta verde.
const BASE = (process.env.SMOKE_BASE || "http://localhost:3111").replace(/\/$/, "");
const ORIGIN = new URL(BASE).origin;
const PASSWORD = process.env.SMOKE_PASSWORD || process.env.APP_PASSWORD || "";

// Prefisso dei dati di test: serve alla pulizia, anche delle run interrotte.
const PREFIX = "Flussi Test —";

let sessionCookie = "";
const pass = [];
const fail = [];
const lines = [];

function check(name, ok, detail) {
  lines.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " -- " + detail : ""}`);
  if (ok) pass.push(name);
  else fail.push(name);
}

async function login() {
  if (!PASSWORD) {
    throw new Error("Manca SMOKE_PASSWORD/APP_PASSWORD: senza sessione gli endpoint rispondono 401.");
  }
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login fallito (HTTP ${res.status}).`);
  sessionCookie = (res.headers.get("set-cookie") || "").split(";")[0].trim();
  if (!sessionCookie) throw new Error("Login riuscito ma senza cookie di sessione.");
}

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(sessionCookie ? { cookie: sessionCookie } : {}),
      // Il proxy richiede mutazioni same-origin: l'Origin deve combaciare con l'Host.
      Origin: ORIGIN,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* risposta non JSON */
  }
  return { status: res.status, data };
}

async function allLeads() {
  const r = await api("GET", "/api/leads");
  return r.data?.leads ?? [];
}

async function leadByName(name) {
  return (await allLeads()).find((l) => l.name === name) ?? null;
}

async function cleanup() {
  const stale = (await allLeads()).filter((l) => l.name.startsWith(PREFIX));
  if (stale.length) {
    await api("POST", "/api/leads/bulk", { ids: stale.map((l) => l.id), action: "delete" });
    lines.push(`INFO  ripuliti ${stale.length} lead di test`);
  }
  return stale.length;
}

const round = (n) => Math.round(n * 100) / 100;

async function main() {
  await login();
  await cleanup();

  // ---------------------------------------------------------
  // 1. Dati del lead: creazione, campi sanificati, modifica, verifica
  // ---------------------------------------------------------
  const nameA = PREFIX + " Dati";
  const created = await api("POST", "/api/leads", {
    candidates: [
      {
        name: nameA,
        category: "pasticceria",
        addressFull: "Via dei Test 1",
        city: "Milano",
        lat: 45.4642,
        lng: 9.19,
        priorityScore: 77,
        priorityReason: "Nessun sito, buone recensioni",
        osmId: "flussi-test-dati",
      },
      // Stesso osmId: la deduplica interna deve scartarlo.
      { name: nameA + " bis", osmId: "flussi-test-dati" },
    ],
  });
  check(
    "creazione lead: salva il nuovo e ignora il duplicato osmId nello stesso invio",
    created.status === 200 && created.data?.saved === 1 && created.data?.skipped === 0,
    JSON.stringify(created.data)
  );

  const createdAgain = await api("POST", "/api/leads", {
    candidates: [{ name: nameA, city: "Milano", osmId: "flussi-test-dati" }],
  });
  check(
    "creazione lead: un lead gia' presente viene scartato",
    createdAgain.status === 200 && createdAgain.data?.saved === 0 && createdAgain.data?.skipped === 1,
    JSON.stringify(createdAgain.data)
  );

  const leadA = await leadByName(nameA);
  check("lead creato leggibile dall'elenco", Boolean(leadA?.id));
  if (!leadA) throw new Error("Lead principale non creato: impossibile proseguire.");
  check(
    "campi salvati come inviati",
    leadA.priorityScore === 77 &&
      leadA.city === "Milano" &&
      leadA.status === "NUOVO" &&
      leadA.source === "overpass" &&
      leadA.osmId === "flussi-test-dati",
    `score=${leadA.priorityScore} status=${leadA.status} source=${leadA.source}`
  );

  const detailA = await api("GET", "/api/leads/" + leadA.id);
  check(
    "dettaglio lead include attivita e tag",
    detailA.status === 200 && Array.isArray(detailA.data?.lead?.activities) && Array.isArray(detailA.data?.lead?.tags)
  );

  const badEmail = await api("PATCH", "/api/leads/" + leadA.id, { email: "non-una-email" });
  const afterBad = await api("GET", "/api/leads/" + leadA.id);
  check(
    "modifica con email non valida respinta e non applicata",
    badEmail.status === 400 && afterBad.data?.lead?.email == null,
    `HTTP ${badEmail.status}`
  );

  const patched = await api("PATCH", "/api/leads/" + leadA.id, {
    status: "CONTATTATO",
    phone: "+39 02 1234 5678",
    notes: "Richiamare martedi",
  });
  const afterPatch = await api("GET", "/api/leads/" + leadA.id);
  check(
    "modifica valida salvata (stato, telefono, note)",
    patched.status === 200 &&
      afterPatch.data?.lead?.status === "CONTATTATO" &&
      afterPatch.data?.lead?.phone === "+39 02 1234 5678" &&
      afterPatch.data?.lead?.notes === "Richiamare martedi"
  );
  check(
    "il cambio di stato lascia una riga nel diario",
    (afterPatch.data?.lead?.activities ?? []).some(
      (a) => a.type === "stato" && a.description.includes("CONTATTATO")
    )
  );

  // Verifica dati: un lead senza contatti e senza indirizzo non tocca la rete
  // (nessun DNS, nessun HTTP), quindi il risultato e' deterministico anche in CI.
  const nameEmpty = PREFIX + " Dati vuoto";
  await api("POST", "/api/leads", { candidates: [{ name: nameEmpty }] });
  const emptyLead = await leadByName(nameEmpty);
  const verifyEmpty = emptyLead
    ? await api("POST", "/api/leads/" + emptyLead.id + "/verify")
    : { status: 0, data: null };
  const emptyFields = (verifyEmpty.data?.results ?? []).map((r) => r.field).sort();
  check(
    "verifica dati: lead senza dati -> campi 'assente', sito assente confermato, zero problemi",
    verifyEmpty.status === 200 &&
      verifyEmpty.data?.ok === true &&
      JSON.stringify(emptyFields) === JSON.stringify(["address", "email", "phone", "social", "website"]) &&
      verifyEmpty.data?.summary?.total === 5 &&
      verifyEmpty.data?.summary?.pending === 0 &&
      verifyEmpty.data?.summary?.problems === 0 &&
      verifyEmpty.data?.summary?.overall === "verificato" &&
      (verifyEmpty.data?.results ?? []).every((r) =>
        r.field === "website" ? r.status === "verificato" : r.status === "assente"
      ),
    JSON.stringify(verifyEmpty.data?.summary)
  );

  // Sul lead con indirizzo e coordinate il runner non puo' confermare la
  // posizione (nessun geocoder): il campo resta da verificare, non "ok".
  const verify = await api("POST", "/api/leads/" + leadA.id + "/verify");
  const fields = (verify.data?.results ?? []).map((r) => r.field).sort();
  const address = (verify.data?.results ?? []).find((r) => r.field === "address");
  check(
    "verifica dati: indirizzo con coordinate resta da verificare, nessun falso 'ok'",
    verify.status === 200 &&
      verify.data?.ok === true &&
      JSON.stringify(fields) === JSON.stringify(["address", "email", "phone", "social", "website"]) &&
      verify.data?.summary?.total === 5 &&
      verify.data?.summary?.problems === 0 &&
      address?.status === "da_verificare",
    `address=${address?.status} ${JSON.stringify(verify.data?.summary)}`
  );

  const stored = await api("GET", "/api/leads/" + leadA.id + "/verification");
  check(
    "verifica dati: fotografia salvata e rileggibile",
    stored.status === 200 && (stored.data?.results ?? []).length === 5
  );

  const verifyAgain = await api("POST", "/api/leads/" + leadA.id + "/verify");
  const storedAgain = await api("GET", "/api/leads/" + leadA.id + "/verification");
  const uniqueFields = new Set((storedAgain.data?.results ?? []).map((r) => r.field));
  check(
    "verifica ripetuta: sostituisce la fotografia, non duplica le righe",
    verifyAgain.status === 200 &&
      (storedAgain.data?.results ?? []).length === 5 &&
      uniqueFields.size === 5,
    `${(storedAgain.data?.results ?? []).length} righe, ${uniqueFields.size} campi`
  );

  // ---------------------------------------------------------
  // 2. Import CSV: deduplica, righe scartate, sanificazione dei valori
  // ---------------------------------------------------------
  const nameB = PREFIX + " Import A";
  const nameC = PREFIX + " Import B";
  const rows = [
    {
      name: nameB,
      city: "Torino",
      category: "gelateria",
      website: "https://esempio.test",
      googleRating: "4.56",
      googleReviews: "12",
      lat: "45,07",
      lng: "7.68",
    },
    // Duplicato dentro lo stesso file (stesso nome + citta).
    { name: nameB, city: "Torino" },
    // Senza nome: scartato.
    { name: "   ", city: "Torino" },
    // Stato inesistente: scartato invece di finire nel CRM.
    { name: PREFIX + " Stato rotto", city: "Torino", status: "BOH" },
    {
      name: nameC,
      city: "Torino",
      googleRating: "9",
      googleReviews: "-3",
      priorityScore: "150",
      lat: "999",
      lng: "7.68",
    },
  ];
  const imported = await api("POST", "/api/leads/import", { rows });
  check(
    "import CSV: crea 2 lead validi e scarta 3 righe",
    imported.status === 200 && imported.data?.created === 2 && imported.data?.skipped === 3,
    JSON.stringify(imported.data)
  );

  const leadB = await leadByName(nameB);
  check(
    "import CSV: valori sanificati (voto arrotondato, coordinate col decimali, sito)",
    Boolean(leadB) &&
      leadB.googleRating === 4.6 &&
      leadB.googleReviews === 12 &&
      leadB.hasWebsite === true &&
      leadB.lat === 45.07 &&
      leadB.lng === 7.68 &&
      leadB.source === "import_csv",
    leadB ? `rating=${leadB.googleRating} reviews=${leadB.googleReviews} lat=${leadB.lat}` : "lead assente"
  );

  const leadC = await leadByName(nameC);
  check(
    "import CSV: valori fuori scala scartati o limitati",
    Boolean(leadC) &&
      leadC.googleRating === null &&
      leadC.googleReviews === null &&
      leadC.priorityScore === 100 &&
      leadC.lat === null &&
      leadC.lng === 7.68,
    leadC ? `rating=${leadC.googleRating} score=${leadC.priorityScore} lat=${leadC.lat}` : "lead assente"
  );

  const reimport = await api("POST", "/api/leads/import", { rows });
  check(
    "import CSV ripetuto: non crea doppioni",
    reimport.status === 200 && reimport.data?.created === 0 && reimport.data?.skipped === 5,
    JSON.stringify(reimport.data)
  );

  // ---------------------------------------------------------
  // 3. Ricevute: numerazione progressiva, importi, modifica, elenco
  // ---------------------------------------------------------
  const year = new Date().getFullYear();
  const r1 = await api("POST", "/api/receipts", {
    leadId: leadA.id,
    description: "Sito vetrina",
    amount: 1234.567,
    method: "carta",
    paidAt: year + "-11-03",
  });
  check(
    "ricevuta: numero progressivo dell'anno e importo ai centesimi",
    r1.status === 201 &&
      new RegExp("^RICEVUTA-" + year + "-\\d{3,}$").test(r1.data?.receipt?.number ?? "") &&
      r1.data?.receipt?.amount === 1234.57 &&
      r1.data?.receipt?.method === "carta",
    JSON.stringify({ status: r1.status, number: r1.data?.receipt?.number, amount: r1.data?.receipt?.amount })
  );

  const r2 = await api("POST", "/api/receipts", {
    leadId: leadA.id,
    description: "Manutenzione",
    amount: 90,
    method: "metodo-inventato",
  });
  const seq1 = Number((r1.data?.receipt?.number ?? "").split("-").pop());
  const seq2 = Number((r2.data?.receipt?.number ?? "").split("-").pop());
  check(
    "ricevuta: numero successivo e metodo sconosciuto ricondotto a contanti",
    r2.status === 201 && seq2 === seq1 + 1 && r2.data?.receipt?.method === "contanti",
    `${r1.data?.receipt?.number} -> ${r2.data?.receipt?.number}`
  );

  const rBad = await api("POST", "/api/receipts", { leadId: leadA.id, amount: 0 });
  check("ricevuta: importo non positivo respinto", rBad.status === 400, `HTTP ${rBad.status}`);
  const rNoLead = await api("POST", "/api/receipts", { amount: 10 });
  check("ricevuta: senza lead respinta", rNoLead.status === 400, `HTTP ${rNoLead.status}`);
  const rUnknown = await api("POST", "/api/receipts", { leadId: "non-esiste", amount: 10 });
  check("ricevuta: lead inesistente -> 404", rUnknown.status === 404, `HTTP ${rUnknown.status}`);

  const list = await api("GET", "/api/receipts?leadId=" + leadA.id);
  check(
    "ricevute: elenco del lead in ordine di data",
    list.status === 200 &&
      (list.data?.receipts ?? []).length === 2 &&
      list.data.receipts[0].number === r2.data?.receipt?.number,
    `${(list.data?.receipts ?? []).length} ricevute`
  );

  const one = await api("GET", "/api/receipts/" + r1.data.receipt.id);
  check(
    "ricevuta: dettaglio con nome del lead",
    one.status === 200 && one.data?.receipt?.lead?.name === nameA
  );

  const patchedReceipt = await api("PATCH", "/api/receipts/" + r1.data.receipt.id, {
    amount: 1000,
    method: "bonifico",
    description: "Sito vetrina + dominio",
  });
  check(
    "ricevuta: modifica di importo, metodo e descrizione",
    patchedReceipt.status === 200 &&
      round(patchedReceipt.data?.receipt?.amount) === 1000 &&
      patchedReceipt.data?.receipt?.method === "bonifico" &&
      patchedReceipt.data?.receipt?.description === "Sito vetrina + dominio"
  );

  const badDate = await api("PATCH", "/api/receipts/" + r1.data.receipt.id, { paidAt: "non-una-data" });
  check("ricevuta: data non valida respinta", badDate.status === 400, `HTTP ${badDate.status}`);

  const deletedReceipt = await api("DELETE", "/api/receipts/" + r2.data.receipt.id);
  const goneReceipt = await api("GET", "/api/receipts/" + r2.data.receipt.id);
  check(
    "ricevuta: cancellazione effettiva",
    deletedReceipt.status === 200 && goneReceipt.status === 404,
    `${deletedReceipt.status}/${goneReceipt.status}`
  );

  // ---------------------------------------------------------
  // 4. Azioni massive: cambio stato, validazioni, eliminazione a cascata
  // ---------------------------------------------------------
  const bulkStatus = await api("POST", "/api/leads/bulk", {
    ids: [leadA.id, leadB.id],
    action: "status",
    status: "CLIENTE",
  });
  const afterBulkA = await api("GET", "/api/leads/" + leadA.id);
  const afterBulkB = await api("GET", "/api/leads/" + leadB.id);
  check(
    "azione massiva: cambia lo stato di tutti i lead indicati",
    bulkStatus.status === 200 &&
      bulkStatus.data?.updated === 2 &&
      afterBulkA.data?.lead?.status === "CLIENTE" &&
      afterBulkB.data?.lead?.status === "CLIENTE",
    JSON.stringify(bulkStatus.data)
  );
  check(
    "azione massiva: una riga di diario per ogni lead toccato",
    (afterBulkA.data?.lead?.activities ?? []).some((a) => a.description.includes("CLIENTE")) &&
      (afterBulkB.data?.lead?.activities ?? []).some((a) => a.description.includes("CLIENTE"))
  );

  const bulkBadStatus = await api("POST", "/api/leads/bulk", {
    ids: [leadA.id],
    action: "status",
    status: "NON_ESISTE",
  });
  check("azione massiva: stato inesistente respinto", bulkBadStatus.status === 400, `HTTP ${bulkBadStatus.status}`);
  check(
    "azione massiva: nessun lead selezionato respinto",
    (await api("POST", "/api/leads/bulk", { ids: [], action: "delete" })).status === 400
  );
  check(
    "azione massiva: azione inesistente respinta",
    (await api("POST", "/api/leads/bulk", { ids: [leadA.id], action: "archivia" })).status === 400
  );
  const bulkGhost = await api("POST", "/api/leads/bulk", { ids: ["inesistente"], action: "delete" });
  check(
    "azione massiva: id inesistente non e' un errore (0 eliminati)",
    bulkGhost.status === 200 && bulkGhost.data?.deleted === 0,
    JSON.stringify(bulkGhost.data)
  );

  const del = await api("POST", "/api/leads/bulk", { ids: [leadC.id], action: "delete" });
  const afterDel = await api("GET", "/api/leads/" + leadC.id);
  check(
    "azione massiva: eliminazione del lead",
    del.status === 200 && del.data?.deleted === 1 && afterDel.status === 404,
    `${del.data?.deleted}/${afterDel.status}`
  );

  // La ricevuta superstite deve sparire con il lead (cascata).
  const delA = await api("POST", "/api/leads/bulk", { ids: [leadA.id], action: "delete" });
  const receiptsAfterDelete = await api("GET", "/api/receipts?leadId=" + leadA.id);
  check(
    "eliminazione lead: le ricevute collegate spariscono",
    delA.status === 200 && (receiptsAfterDelete.data?.receipts ?? []).length === 0
  );
}

try {
  await main();
} finally {
  try {
    await cleanup();
  } catch (err) {
    lines.push(`INFO  pulizia non riuscita: ${err instanceof Error ? err.message : err}`);
  }
  console.log(lines.join("\n"));
  console.log(`\nControlli superati: ${pass.length}/${pass.length + fail.length}`);
  if (fail.length) {
    console.log("Controlli falliti:");
    for (const f of fail) console.log("  " + f);
  }
  process.exit(fail.length ? 1 : 0);
}
