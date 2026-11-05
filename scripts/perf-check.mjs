// scripts/perf-check.mjs — controllo delle performance su un server acceso.
//
// Misura cose reali, non stime: tempo di risposta (dal primo byte all'ultimo)
// e byte effettivamente scaricati per le pagine e le API piu' usate. Fallisce
// se una misura supera il budget, cosi' "l'app non deve laggare" e' un
// controllo automatico e non una promessa.
//
// Uso: server avviato (es. PORT=3111 npm start), poi
//   SMOKE_BASE=http://localhost:3111 node scripts/perf-check.mjs
//
// I budget si possono allargare senza toccare il codice (solo per macchine
// lente o per diagnosi): PERF_BUDGET_SCALE=2 node scripts/perf-check.mjs
const BASE = process.env.SMOKE_BASE || "http://localhost:3111";
const SCALE = Number(process.env.PERF_BUDGET_SCALE ?? 1) || 1;

const pass = [];
const fail = [];
const skip = [];

function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " -- " + detail : ""}`);
  (ok ? pass : fail).push(name);
}

// Su un database appena inizializzato non ci sono lead: i controlli che
// parlano dei dati non possono dire niente, e non e' un errore.
function skipUnlessData(hasData, name) {
  if (hasData) return true;
  console.log(`SKIP  ${name} -- database senza lead`);
  skip.push(name);
  return false;
}

// pages: HTML renderizzato (peso non compresso: e' quello che il browser deve
// analizzare per disegnare la pagina). Le API: JSON scaricato dall'interfaccia.
const TARGETS = [
  { path: "/dashboard", kind: "pagina", maxMs: 3000, maxBytes: 500_000 },
  { path: "/ricerca", kind: "pagina", maxMs: 2000, maxBytes: 400_000 },
  { path: "/opportunita", kind: "pagina", maxMs: 2500, maxBytes: 500_000 },
  { path: "/crm", kind: "pagina", maxMs: 2500, maxBytes: 500_000 },
  { path: "/impostazioni", kind: "pagina", maxMs: 2000, maxBytes: 400_000 },
  { path: "/api/settings", kind: "api", maxMs: 1500, maxBytes: 200_000 },
  { path: "/api/leads", kind: "api", maxMs: 2000, maxBytes: 300_000 },
  { path: "/api/notifications", kind: "api", maxMs: 1500, maxBytes: 200_000 },
];

function human(bytes) {
  return bytes >= 1024 ? (bytes / 1024).toFixed(1) + " KB" : bytes + " B";
}

async function measure(path) {
  const started = Date.now();
  const res = await fetch(BASE + path, { headers: { "Accept-Encoding": "identity" } });
  const body = Buffer.from(await res.arrayBuffer());
  const ms = Date.now() - started;
  return { status: res.status, ms, bytes: body.byteLength, text: body.toString("utf8", 0, 200_000) };
}

async function main() {
  // La home deve essere un redirect HTTP vero (307/308), non un 200 con meta
  // refresh: cosi' non mostra un lampo di interfaccia e i motori di ricerca la
  // trattano come redirect invece che come pagina vuota.
  const home = await fetch(BASE + "/", { redirect: "manual" });
  check(
    "la home risponde con un redirect HTTP (non un 200 con meta refresh)",
    home.status === 307 || home.status === 308,
    "status=" + home.status
  );
  check(
    "la home rimanda a /dashboard",
    (home.headers.get("location") || "").endsWith("/dashboard"),
    "location=" + (home.headers.get("location") || "-")
  );

  // Server raggiungibile?
  const ping = await fetch(BASE + "/api/settings").catch(() => null);
  if (!ping || !ping.ok) {
    console.error(
      `Server non raggiungibile su ${BASE}.\n` +
        "Avvia prima: npm run build && PORT=3111 npm start"
    );
    process.exit(2);
  }

  console.log(`Controllo performance su ${BASE} (budget x${SCALE})\n`);

  for (const t of TARGETS) {
    let m;
    try {
      m = await measure(t.path);
    } catch (err) {
      check(`${t.kind} ${t.path} risponde`, false, err instanceof Error ? err.message : String(err));
      continue;
    }
    check(`${t.kind} ${t.path} -> 200`, m.status === 200, `status=${m.status}`);
    const maxMs = Math.round(t.maxMs * SCALE);
    const maxBytes = Math.round(t.maxBytes * SCALE);
    check(
      `${t.kind} ${t.path} entro ${maxMs} ms`,
      m.ms <= maxMs,
      `${m.ms} ms`
    );
    check(
      `${t.kind} ${t.path} entro ${human(maxBytes)}`,
      m.bytes <= maxBytes,
      human(m.bytes)
    );
  }

  // L'elenco lead alimenta liste e menu a tendina: non deve trasportare i campi
  // pesanti (HTML delle anteprime demo, prompt AI, screenshot), altrimenti
  // l'interfaccia si blocca mentre li scarica e li analizza.
  const leadsRes = await fetch(BASE + "/api/leads", { headers: { "Accept-Encoding": "identity" } });
  const leadsJson = await leadsRes.json().catch(() => ({}));
  const rows = Array.isArray(leadsJson.leads) ? leadsJson.leads : [];
  const heavy = ["demoHtml", "demoPrompt", "websiteScreenshot"];
  const carried = heavy.filter((f) => rows.some((l) => Object.prototype.hasOwnProperty.call(l, f)));
  if (skipUnlessData(rows.length > 0, "l'elenco lead non trasporta i campi pesanti")) {
    check(
      "l'elenco lead non trasporta i campi pesanti (HTML demo, prompt AI, screenshot)",
      carried.length === 0,
      carried.length ? "presenti: " + carried.join(", ") : `${rows.length} lead, nessuno dei tre campi`
    );
    // L'elenco deve restare completo: un `select` sbagliato puo' svuotare i lead
    // senza cambiare ne' lo stato HTTP ne' il tempo di risposta.
    const incomplete = rows.filter((l) => !l.id || !l.name);
    check(
      "l'elenco lead contiene id e nome per ogni riga",
      incomplete.length === 0,
      incomplete.length ? incomplete.length + " righe senza id/nome" : `${rows.length} righe complete`
    );
  }

  // La coda delle opportunita' e' paginata: il primo schermo deve restare
  // leggero anche con centinaia di attivita' in archivio. Contiamo gli id lead
  // distinti linkati alle schede: il payload di React ripete le stesse stringhe
  // piu' volte, quindi contare le occorrenze grezze darebbe un numero gonfiato.
  const opp = await fetch(BASE + "/opportunita", { headers: { "Accept-Encoding": "identity" } });
  const oppHtml = Buffer.from(await opp.arrayBuffer()).toString("utf8");
  const cardIds = new Set(Array.from(oppHtml.matchAll(/\/crm\/([a-z0-9]+)/gi), (m) => m[1]));
  if (skipUnlessData(cardIds.size > 0, "la coda delle opportunita' e' paginata")) {
    check(
      "la coda delle opportunita' disegna una pagina alla volta (max 25 attivita')",
      cardIds.size <= 25,
      `${cardIds.size} schede distinte nell'HTML`
    );
  }

  const skipped = skip.length ? `, ${skip.length} saltati (nessun dato)` : "";
  console.log(`\nTotale: ${pass.length} pass, ${fail.length} fail${skipped}`);
  if (fail.length) {
    console.log("FALLITI:\n - " + fail.join("\n - "));
    process.exit(1);
  }
  console.log("PERF OK — pagine e API entro budget");
}

await main();
