// ============================================================
// Seed del database (idempotente: puoi rieseguirlo senza paura).
// - Ricrea i 3 template standard (con italiano corretto e accenti).
// - Crea/aggiorna i tag e le impostazioni SENZA sovrascrivere i tuoi valori.
// - Inserisce 2 lead di esempio SOLO se il CRM e vuoto (non tocca i tuoi lead).
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
  const tagCaldo = await prisma.tag.findUnique({ where: { name: "Caldo" } });

  // 3) IMPOSTAZIONI — crea solo se mancanti (NON sovrascrive i tuoi valori).
  const settingDefs = [
    { key: "brand_name", value: "La Tua Web Agency" },
    { key: "brand_owner", value: "Il Tuo Nome" },
    { key: "search_city", value: "Feltre" },
  ];
  for (const s of settingDefs) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  // 4) LEAD DI ESEMPIO — solo se il CRM e completamente vuoto.
  const leadCount = await prisma.lead.count();
  if (leadCount === 0) {
    await prisma.lead.create({
      data: {
        name: "Trattoria da Esempio",
        category: "restaurant",
        subcategory: "Ristorante",
        phone: "+39 0439 000000",
        whatsapp: "390439000000",
        city: "Feltre",
        addressFull: "Via Esempio 1, 32032 Feltre BL",
        hasWebsite: false,
        hasSocial: false,
        websiteStatus: "da_verificare",
        googleRating: 4.6,
        googleReviews: 38,
        priorityScore: 95,
        priorityReason: "nessun sito rilevato (da verificare) + nessun social attivo + buone recensioni",
        status: "NUOVO",
        source: "seed",
        lat: 46.0172,
        lng: 11.91,
        tags: tagCaldo ? { connect: { id: tagCaldo.id } } : undefined,
      },
    });
    await prisma.lead.create({
      data: {
        name: "Parrucchiere Demo",
        category: "hairdresser",
        subcategory: "Parrucchiere",
        phone: "+39 0439 111111",
        city: "Feltre",
        addressFull: "Piazza Demo 2, 32032 Feltre BL",
        hasWebsite: false,
        hasSocial: true,
        instagram: "https://instagram.com/esempio",
        websiteStatus: "da_verificare",
        priorityScore: 70,
        priorityReason: "nessun sito rilevato (da verificare) + presente sui social",
        status: "NUOVO",
        source: "seed",
        lat: 46.018,
        lng: 11.905,
      },
    });
  }

  console.log("Seed completato: template aggiornati, tag e impostazioni ok.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
