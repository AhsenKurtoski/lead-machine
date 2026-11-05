// ============================================================
// Seed del database (idempotente: puoi rieseguirlo senza paura).
// - Ricrea i template standard WhatsApp ed email (italiano con accenti).
// - Crea/aggiorna i tag e le impostazioni SENZA sovrascrivere i tuoi valori.
// - Nessun dato inventato: il CRM parte vuoto e i lead arrivano solo dalle
//   ricerche reali dell'utente (niente attivita di esempio).
// Esegui:  npm run db:seed
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Nomi dei template gestiti dal seed: vengono ricreati a ogni esecuzione.
const SEEDED_TEMPLATE_NAMES = [
  "WhatsApp - Primo contatto (no sito)",
  "WhatsApp - Sito da migliorare (restyling)",
  "WhatsApp - Presenza social",
  "Email - Proposta sito web (no sito)",
  "Email - Proposta restyling (ha gia un sito)",
];

const WA_NO_SITO =
  "Salve [nome], sono [io_nome], web developer della zona di [citta]. " +
  "Ho visto che la vostra attivita ([categoria]) non ha ancora un sito web e mi sono permesso di preparare " +
  "un'anteprima gratuita, costruita sui vostri dati reali, per mostrarvi come potreste apparire online. " +
  "Posso inviarvela qui senza alcun impegno: la guardate con calma e mi dite cosa ne pensate. " +
  "Seguo personalmente ogni progetto, passo dopo passo. Quando posso mandarvela?";

const WA_RESTYLING =
  "Salve [nome], sono [io_nome], web developer della zona di [citta]. " +
  "Ho dato un'occhiata al vostro sito attuale: con pochi accorgimenti (grafica piu moderna, velocita e " +
  "visibilita su Google) potrebbe rendere molto di piu e portarvi nuovi clienti. " +
  "Mi piacerebbe proporvi un restyling su misura, a un costo contenuto. " +
  "Posso prepararvi gratuitamente un'anteprima di come lo rinnoverei? Me ne occupo io di persona.";

const WA_SOCIAL =
  "Salve [nome], sono [io_nome], web developer della zona di [citta]. " +
  "Vi seguo gia sui social, complimenti! Per un'attivita come la vostra ([categoria]) un vero sito web, " +
  "collegato ai social, darebbe molta piu credibilita e vi farebbe trovare su Google da chi vi cerca. " +
  "Posso mostrarvi gratis e senza impegno un'anteprima di come potrebbe essere. Ve la preparo?";

const EMAIL_BODY =
  "Gentile [nome],\n\n" +
  "mi chiamo [io_nome] e sono un web developer che segue personalmente le attivita di [citta] e dintorni.\n\n" +
  "Ho notato che [nome] non ha ancora un sito web e ho preparato per voi un'anteprima gratuita e senza impegno, " +
  "costruita sui vostri dati reali: cosi potete vedere con i vostri occhi come apparireste online, su computer e smartphone.\n\n" +
  "Non sono un'agenzia che vi tratta come un numero: lavoro da solo e seguo ogni cliente di persona, dall'idea alla pubblicazione.\n\n" +
  "Se l'idea vi piace, rispondete a questa email oppure chiamatemi al [io_telefono]: vi mostro subito l'anteprima.\n\n" +
  "Un cordiale saluto,\n[io_nome]\n[io_attivita]\n\n" +
  "---\nRicevete questa email in quanto attivita presente in elenchi pubblici. " +
  "Se non desiderate altre comunicazioni, rispondete con OPT-OUT e non vi scrivero piu.";

const EMAIL_RESTYLING =
  "Gentile [nome],\n\n" +
  "mi chiamo [io_nome], sono un web developer della zona di [citta] e seguo personalmente ogni progetto.\n\n" +
  "Ho visto il sito attuale di [nome]: ha delle buone basi, ma con un restyling mirato (design piu moderno, " +
  "caricamento veloce, ottimizzazione per smartphone e per Google) potrebbe portarvi molti piu contatti, con un investimento contenuto.\n\n" +
  "Posso prepararvi gratuitamente un'anteprima di come lo rinnoverei, cosi valutate senza impegno.\n\n" +
  "Per qualsiasi cosa rispondete a questa email o chiamatemi al [io_telefono].\n\n" +
  "Un cordiale saluto,\n[io_nome]\n[io_attivita]\n\n" +
  "---\nRicevete questa email in quanto attivita presente in elenchi pubblici. " +
  "Se non desiderate altre comunicazioni, rispondete con OPT-OUT e non vi scrivero piu.";

async function main() {
  // 1) TEMPLATE — ricreati a ogni seed (rimuovo solo quelli gestiti dal seed).
  await prisma.messageTemplate.deleteMany({
    where: { name: { in: SEEDED_TEMPLATE_NAMES } },
  });

  await prisma.messageTemplate.create({
    data: {
      name: "WhatsApp - Primo contatto (no sito)",
      channel: "whatsapp",
      body: WA_NO_SITO,
      isDefault: true,
    },
  });
  await prisma.messageTemplate.create({
    data: {
      name: "WhatsApp - Sito da migliorare (restyling)",
      channel: "whatsapp",
      body: WA_RESTYLING,
      isDefault: false,
    },
  });
  await prisma.messageTemplate.create({
    data: {
      name: "WhatsApp - Presenza social",
      channel: "whatsapp",
      body: WA_SOCIAL,
      isDefault: false,
    },
  });
  await prisma.messageTemplate.create({
    data: {
      name: "Email - Proposta sito web (no sito)",
      channel: "email",
      subject: "Un'anteprima di sito web gratuita per [nome]",
      body: EMAIL_BODY,
      isDefault: true,
    },
  });
  await prisma.messageTemplate.create({
    data: {
      name: "Email - Proposta restyling (ha gia un sito)",
      channel: "email",
      subject: "Un'idea per rinnovare il sito di [nome]",
      body: EMAIL_RESTYLING,
      isDefault: false,
    },
  });

  // 2) TAG — upsert per nome (non duplica, non cancella i tuoi tag).
  const tagDefs = [
    { name: "Caldo", color: "#ef4444" },
    { name: "Da richiamare", color: "#f59e0b" },
    { name: "Referral", color: "#10b981" },
  ];
  for (const t of tagDefs) {
    await prisma.tag.upsert({
      where: { name: t.name },
      update: { color: t.color },
      create: t,
    });
  }

  // 3) IMPOSTAZIONI — nessun brand inventato. Il brand viene impostato
  // dall'onboarding o dalle Impostazioni; il seed non deve far comparire
  // "La Tua Web Agency" nelle email o nei siti demo.

  console.log("Seed completato: template aggiornati e tag ok.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
