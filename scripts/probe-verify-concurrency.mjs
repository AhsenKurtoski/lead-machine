#!/usr/bin/env node
// ============================================================
// La scrittura della verifica e' atomica? (controllo ripetibile)
//
// Lancia N verifiche IN PARALLELO sullo stesso lead e poi conta le righe
// salvate: deve restare UNA fotografia per campo (5 righe), non di piu'. E'
// la prova che la transazione in `verify-runner.ts` regge le richieste
// concorrenti, che e' la ragione per cui il modello Verification non ha bisogno
// di un vincolo unique (che obbligherebbe ogni installazione esistente a un
// `prisma db push --accept-data-loss`).
//
// Uso (server acceso, come per gli altri smoke):
//   SMOKE_BASE=http://127.0.0.1:3111 node scripts/probe-verify-concurrency.mjs [N]
//
// Serve un database con almeno un lead che abbia un'email: il lead non viene
// modificato se non nella sua fotografia di verifica (e' il comportamento
// normale di "Verifica ora").
// ============================================================
import { createRequire } from "node:module";

const BASE = process.env.SMOKE_BASE || "http://127.0.0.1:3111";
const require_ = createRequire(import.meta.url);
const { PrismaClient } = require_("@prisma/client");
const prisma = new PrismaClient();

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? " -- " + detail : ""}`);
  if (!ok) failures++;
}

const lead = await prisma.lead.findFirst({
  where: { email: { contains: "@" } },
  orderBy: { createdAt: "desc" },
  select: { id: true, name: true },
});
if (!lead) {
  console.error("Nessun lead con email nel database: nulla da verificare. Esegui prima una ricerca.");
  await prisma.$disconnect();
  process.exit(2);
}
console.log(`Lead di prova: ${lead.name} (${lead.id})\n`);

const N = Math.max(2, Math.min(Number(process.argv[2] || 4) || 4, 10));
const started = Date.now();
const results = await Promise.all(
  Array.from({ length: N }, async () => {
    const res = await fetch(`${BASE}/api/leads/${lead.id}/verify`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, ok: body.ok === true, error: body.error };
  })
);
console.log(`${N} verifiche in parallelo concluse in ${Date.now() - started} ms\n`);

check(
  "nessuna richiesta concorrente e' fallita",
  results.every((r) => r.status === 200 && r.ok),
  results.filter((r) => r.status !== 200 || !r.ok).length + " fallite"
);

const rows = await prisma.verification.findMany({ where: { leadId: lead.id }, select: { field: true } });
const perField = rows.reduce((acc, r) => ((acc[r.field] = (acc[r.field] ?? 0) + 1), acc), {});
const duplicated = Object.entries(perField).filter(([, n]) => n > 1);
console.log("righe per campo:", JSON.stringify(perField));
check(
  "una sola fotografia per campo, anche con richieste concorrenti",
  duplicated.length === 0,
  duplicated.length ? "campi duplicati: " + JSON.stringify(duplicated) : `${rows.length} righe`
);

await prisma.$disconnect();
console.log(failures === 0 ? "\nOK — la scrittura della verifica e' atomica" : `\n${failures} controlli falliti`);
process.exit(failures === 0 ? 0 : 1);
