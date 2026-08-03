// ============================================================
// Generatore contenuti "sito demo" PREMIUM (funzione E + Q multi-template).
// Ogni gruppo categoria ha palette multiple + contenuti dedicati.
// La palette viene scelta in modo deterministico dall'id del lead, cosi
// attivita diverse (anche della stessa categoria) hanno colori diversi.
// ============================================================

import { CATEGORIES } from "@/lib/categories";

export type DemoService = { icon: string; title: string; text: string };
export type DemoStat = { value: string; label: string };
export type DemoPalette = { primary: string; secondary: string; dark: string };
export type DemoNavLink = { label: string; href: string };
export type DemoFaq = { q: string; a: string };

export type DemoTheme = {
  group: string;
  emoji: string;
  font: "sans" | "serif";
  tagline: string;
  heroSubtitle: string;
  palette: DemoPalette;
  photoKeyword: string;
  services: DemoService[];
  features: string[];
  faqs: DemoFaq[];
  stats: DemoStat[];
  testimonial: { quote: string; author: string };
  ctaLabel: string;
  navLinks: DemoNavLink[];
};

type GroupDef = {
  emoji: string;
  font: "sans" | "serif";
  tagline: string;
  heroSubtitle: string;
  palettes: DemoPalette[];
  photoKeyword: string;
  services: DemoService[];
  features: string[];
  faqs: DemoFaq[];
  stats: DemoStat[];
  testimonial: { quote: string; author: string };
  ctaLabel: string;
};

export const NAV_LINKS: DemoNavLink[] = [
  { label: "Home", href: "#home" },
  { label: "Servizi", href: "#servizi" },
  { label: "Chi siamo", href: "#chi-siamo" },
  { label: "Contatti", href: "#contatti" },
];

const DEFAULT_GROUP: GroupDef = {
  emoji: "\u2B50",
  font: "sans",
  tagline: "Qualità e cura, vicino a te a Feltre",
  photoKeyword: "shop,store",
  faqs: [
    { q: "Dove vi trovate?", a: "Siamo a Feltre (BL) e dintorni. Contattaci per indicazioni e orari aggiornati." },
    { q: "Come posso contattarvi?", a: "Puoi chiamarci, scriverci su WhatsApp o inviarci una email: rispondiamo in giornata." },
    { q: "Il preventivo è gratuito?", a: "Sì, il preventivo è gratuito e senza impegno: raccontaci cosa ti serve." },
    { q: "Quali metodi di pagamento accettate?", a: "Contanti, bancomat e bonifico. Concordiamo insieme la soluzione più comoda." },
  ],
  heroSubtitle: "Una realtà locale che mette al centro le persone e la qualità del servizio.",
  palettes: [
    { primary: "#4f46e5", secondary: "#6366f1", dark: "#160e3a" },
    { primary: "#0d9488", secondary: "#14b8a6", dark: "#06241f" },
    { primary: "#9333ea", secondary: "#c026d3", dark: "#250a3a" },
  ],
  services: [
    { icon: "\u2728", title: "Cosa offriamo", text: "Soluzioni su misura per ogni esigenza, con professionalità e passione." },
    { icon: "\uD83E\uDD1D", title: "Vicini a te", text: "Una realtà del territorio, attenta alle persone e ai dettagli." },
    { icon: "\uD83D\uDCDE", title: "Sempre raggiungibili", text: "Rispondiamo rapidamente a ogni richiesta di informazioni." },
  ],
  features: [
    "Attenzione al cliente",
    "Esperienza sul territorio",
    "Prezzi onesti e trasparenti",
    "Disponibilità e cortesia",
    "Qualità garantita",
  ],
  stats: [
    { value: "100%", label: "Clienti soddisfatti" },
    { value: "Local", label: "Nel cuore di Feltre" },
    { value: "Top", label: "Qualità del servizio" },
  ],
  testimonial: { quote: "Professionalità e gentilezza non comuni. Consigliatissimi!", author: "Recensione cliente" },
  ctaLabel: "Contattaci",
};

const GROUPS: Record<string, GroupDef> = {
  Ricettivita: {
    emoji: "\uD83D\uDECF\uFE0F",
    font: "serif",
    tagline: "Il tuo soggiorno nel cuore delle Dolomiti",
    photoKeyword: "hotel,room",
    faqs: [
      { q: "A che ora sono check-in e check-out?", a: "Il check-in è dal pomeriggio e il check-out in mattinata. Siamo flessibili: scrivici per esigenze particolari." },
      { q: "La colazione è inclusa?", a: "Sì, proponiamo una colazione genuina con prodotti del territorio." },
      { q: "C'è il parcheggio?", a: "Sì, mettiamo a disposizione un parcheggio comodo per gli ospiti." },
      { q: "Gli animali sono ammessi?", a: "Contattaci prima di prenotare: valutiamo insieme la soluzione migliore." },
    ],
    heroSubtitle: "Camere accoglienti, ospitalità autentica e la bellezza del territorio a pochi passi.",
    palettes: [
      { primary: "#0e7490", secondary: "#0891b2", dark: "#083344" },
      { primary: "#1d4ed8", secondary: "#0ea5e9", dark: "#0c1e3a" },
      { primary: "#b45309", secondary: "#d97706", dark: "#3a2410" },
    ],
    services: [
      { icon: "\uD83D\uDECF\uFE0F", title: "Camere & comfort", text: "Ambienti curati e rilassanti per un soggiorno indimenticabile." },
      { icon: "\uD83C\uDFD4\uFE0F", title: "Esperienze sul territorio", text: "Escursioni, natura ed enogastronomia: vivi il meglio della zona." },
      { icon: "\uD83C\uDF73", title: "Colazione genuina", text: "Prodotti locali e freschi per iniziare al meglio la giornata." },
    ],
    features: [
      "Posizione strategica vicino al centro",
      "Wi-Fi gratuito in tutta la struttura",
      "Parcheggio comodo per gli ospiti",
      "Accoglienza personalizzata",
      "Consigli su itinerari e attività",
    ],
    stats: [
      { value: "4.8/5", label: "Giudizio ospiti" },
      { value: "100%", label: "Ospiti soddisfatti" },
      { value: "24/7", label: "Assistenza" },
    ],
    testimonial: { quote: "Un soggiorno perfetto: pulizia, cortesia e una vista stupenda. Torneremo sicuramente!", author: "Recensione ospite" },
    ctaLabel: "Prenota ora",
  },
  Ristorazione: {
    emoji: "\uD83C\uDF7D\uFE0F",
    font: "serif",
    tagline: "Sapori genuini, ospitalità autentica",
    photoKeyword: "restaurant,food",
    faqs: [
      { q: "Serve prenotare?", a: "Consigliamo di prenotare, soprattutto nel weekend: bastano pochi secondi via telefono o WhatsApp." },
      { q: "Avete piatti vegetariani?", a: "Sì, nel menù trovi sempre proposte vegetariane e alternative su richiesta." },
      { q: "Organizzate eventi o cerimonie?", a: "Certo, abbiamo spazi dedicati: raccontaci la tua occasione e troviamo la formula giusta." },
      { q: "Gestite intolleranze e allergie?", a: "Sì, segnalaci le tue esigenze e prepareremo qualcosa adatto a te." },
    ],
    heroSubtitle: "Una cucina del territorio preparata con ingredienti freschi e di stagione.",
    palettes: [
      { primary: "#c2410c", secondary: "#ea580c", dark: "#2b1206" },
      { primary: "#b91c1c", secondary: "#dc2626", dark: "#2a0a0a" },
      { primary: "#854d0e", secondary: "#a16207", dark: "#271a06" },
    ],
    services: [
      { icon: "\uD83C\uDF5D", title: "La nostra cucina", text: "Piatti della tradizione con materie prime selezionate e di stagione." },
      { icon: "\uD83C\uDF77", title: "Cantina & vini", text: "Una selezione di etichette per accompagnare al meglio ogni portata." },
      { icon: "\uD83C\uDF89", title: "Eventi & cerimonie", text: "Spazi accoglienti per cene, feste e occasioni speciali." },
    ],
    features: [
      "Ingredienti freschi e locali",
      "Menù stagionale",
      "Ambiente accogliente",
      "Opzioni vegetariane",
      "Prenotazione semplice e veloce",
    ],
    stats: [
      { value: "\u2605 4.7", label: "Recensioni" },
      { value: "30+", label: "Piatti in menù" },
      { value: "Local", label: "Cucina del territorio" },
    ],
    testimonial: { quote: "Cibo eccellente e personale gentilissimo. Una delle migliori esperienze in zona.", author: "Cliente affezionato" },
    ctaLabel: "Prenota un tavolo",
  },
  Bellezza: {
    emoji: "\u2728",
    font: "sans",
    tagline: "Il tuo benessere, le nostre mani esperte",
    photoKeyword: "salon,beauty",
    faqs: [
      { q: "Come prenoto un appuntamento?", a: "Chiamaci o scrivici su WhatsApp: troviamo insieme l'orario più comodo." },
      { q: "Che prodotti utilizzate?", a: "Solo marche professionali selezionate, per risultati di qualità e duraturi." },
      { q: "Fate consulenze personalizzate?", a: "Sì, ogni trattamento parte da una consulenza su misura per te." },
      { q: "Posso disdire un appuntamento?", a: "Nessun problema: avvisaci con un po' di anticipo e riprogrammiamo insieme." },
    ],
    heroSubtitle: "Trattamenti personalizzati e prodotti di qualità per farti sentire al meglio.",
    palettes: [
      { primary: "#db2777", secondary: "#ec4899", dark: "#3b0a2a" },
      { primary: "#9333ea", secondary: "#c026d3", dark: "#250a3a" },
      { primary: "#e11d48", secondary: "#f43f5e", dark: "#3a0a16" },
    ],
    services: [
      { icon: "\uD83D\uDC87", title: "I nostri servizi", text: "Tagli, trattamenti e cura su misura per ogni esigenza." },
      { icon: "\u2728", title: "Prodotti premium", text: "Solo marche selezionate e tecniche sempre aggiornate." },
      { icon: "\uD83D\uDC86", title: "Relax & benessere", text: "Un'esperienza rigenerante in un ambiente curato." },
    ],
    features: [
      "Staff qualificato e aggiornato",
      "Prodotti professionali",
      "Ambiente curato e rilassante",
      "Appuntamenti flessibili",
      "Consulenza personalizzata",
    ],
    stats: [
      { value: "5.0", label: "Soddisfazione" },
      { value: "1000+", label: "Clienti felici" },
      { value: "Pro", label: "Tecniche aggiornate" },
    ],
    testimonial: { quote: "Professionalità e gentilezza al top. Esco sempre felicissima!", author: "Cliente" },
    ctaLabel: "Prenota un appuntamento",
  },
  Artigiani: {
    emoji: "\uD83D\uDD27",
    font: "sans",
    tagline: "Lavori fatti bene, su cui contare",
    photoKeyword: "workshop,tools",
    faqs: [
      { q: "Il sopralluogo è gratuito?", a: "Sì, sopralluogo e preventivo sono gratuiti e senza impegno." },
      { q: "In quanto tempo intervenite?", a: "Per le urgenze cerchiamo di intervenire in giornata; per i lavori programmati concordiamo la data insieme." },
      { q: "Offrite garanzia sul lavoro?", a: "Sì, ogni intervento è garantito e usiamo materiali di qualità." },
      { q: "Lavorate anche fuori Feltre?", a: "Sì, operiamo a Feltre e nei comuni limitrofi." },
    ],
    heroSubtitle: "Interventi rapidi e affidabili, con preventivi chiari e senza sorprese.",
    palettes: [
      { primary: "#b45309", secondary: "#d97706", dark: "#2a1a06" },
      { primary: "#374151", secondary: "#4b5563", dark: "#111827" },
      { primary: "#1d4ed8", secondary: "#2563eb", dark: "#0c1830" },
    ],
    services: [
      { icon: "\uD83D\uDD27", title: "I nostri servizi", text: "Soluzioni professionali per ogni tipo di intervento." },
      { icon: "\uD83D\uDCCB", title: "Preventivi chiari", text: "Trasparenza totale: sai sempre cosa aspettarti." },
      { icon: "\u23F1\uFE0F", title: "Interventi rapidi", text: "Puntualità e affidabilità, quando serve." },
    ],
    features: [
      "Esperienza pluriennale",
      "Preventivi gratuiti",
      "Materiali di qualità",
      "Interventi puntuali",
      "Garanzia sul lavoro",
    ],
    stats: [
      { value: "15+", label: "Anni di attività" },
      { value: "500+", label: "Lavori svolti" },
      { value: "100%", label: "Clienti soddisfatti" },
    ],
    testimonial: { quote: "Puntuali, precisi e onesti. Consigliatissimi per qualità e prezzo.", author: "Cliente" },
    ctaLabel: "Richiedi un preventivo",
  },
  Negozi: {
    emoji: "\uD83D\uDECD\uFE0F",
    font: "sans",
    tagline: "Il tuo negozio di fiducia a Feltre",
    photoKeyword: "store,products",
    faqs: [
      { q: "Quali sono gli orari?", a: "Contattaci per gli orari aggiornati: siamo aperti tutta la settimana, con orario continuato in alcuni giorni." },
      { q: "Posso prenotare un prodotto?", a: "Certo, scrivici e mettiamo da parte ciò che ti serve." },
      { q: "Fate consegne?", a: "Per alcuni prodotti sì: chiedici informazioni in negozio o via WhatsApp." },
      { q: "Accettate i resi?", a: "Sì, secondo le condizioni di legge. Conserva lo scontrino e contattaci." },
    ],
    heroSubtitle: "Una selezione curata di prodotti e consigli su misura per te.",
    palettes: [
      { primary: "#059669", secondary: "#10b981", dark: "#06281d" },
      { primary: "#0d9488", secondary: "#14b8a6", dark: "#06251f" },
      { primary: "#7c3aed", secondary: "#8b5cf6", dark: "#1f0a3a" },
    ],
    services: [
      { icon: "\uD83D\uDECD\uFE0F", title: "I prodotti", text: "Una scelta di qualità pensata per la nostra clientela." },
      { icon: "\uD83D\uDCA1", title: "Consigli su misura", text: "Ti aiutiamo a scegliere con competenza e cortesia." },
      { icon: "\uD83D\uDE9A", title: "Servizi dedicati", text: "Attenzione al cliente prima, durante e dopo l'acquisto." },
    ],
    features: [
      "Prodotti selezionati",
      "Personale competente",
      "Prezzi onesti",
      "Novità regolari",
      "Assistenza dedicata",
    ],
    stats: [
      { value: "4.9", label: "Giudizio clienti" },
      { value: "1000+", label: "Prodotti" },
      { value: "Local", label: "A Feltre" },
    ],
    testimonial: { quote: "Sempre gentili e disponibili, trovo sempre quello che cerco.", author: "Cliente abituale" },
    ctaLabel: "Vieni a trovarci",
  },
  Professionisti: {
    emoji: "\uD83D\uDCBC",
    font: "sans",
    tagline: "Competenza e fiducia al tuo servizio",
    photoKeyword: "office,professional",
    faqs: [
      { q: "Come fisso un primo appuntamento?", a: "Contattaci: fissiamo un primo incontro conoscitivo per capire le tue esigenze." },
      { q: "Le consulenze sono riservate?", a: "Assolutamente sì: garantiamo massima riservatezza e tutela dei tuoi dati." },
      { q: "Lavorate anche online?", a: "Sì, possiamo seguirti sia di persona sia a distanza." },
      { q: "Come funzionano i costi?", a: "Trasparenza totale: concordiamo i costi in anticipo, senza sorprese." },
    ],
    heroSubtitle: "Consulenza professionale chiara, riservata e su misura per le tue esigenze.",
    palettes: [
      { primary: "#1e3a8a", secondary: "#2563eb", dark: "#0b1733" },
      { primary: "#0f766e", secondary: "#0d9488", dark: "#06241f" },
      { primary: "#4338ca", secondary: "#6366f1", dark: "#160e3a" },
    ],
    services: [
      { icon: "\uD83D\uDCCA", title: "Aree di attività", text: "Servizi professionali con un approccio chiaro e concreto." },
      { icon: "\uD83E\uDD1D", title: "Il nostro approccio", text: "Ascolto, trasparenza e soluzioni efficaci." },
      { icon: "\uD83D\uDD12", title: "Riservatezza", text: "Massima discrezione e attenzione ai tuoi dati." },
    ],
    features: [
      "Professionalità certificata",
      "Consulenza personalizzata",
      "Tempi rispettati",
      "Trasparenza sui costi",
      "Disponibilità e ascolto",
    ],
    stats: [
      { value: "20+", label: "Anni di esperienza" },
      { value: "300+", label: "Clienti seguiti" },
      { value: "100%", label: "Riservatezza" },
    ],
    testimonial: { quote: "Serietà e competenza fuori dal comune. Mi sono sentito seguito in ogni fase.", author: "Cliente" },
    ctaLabel: "Fissa un appuntamento",
  },
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getDemoTheme(
  categoryId?: string | null,
  seed?: string | null,
): DemoTheme {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  const group = cat?.group ?? "";
  const def = GROUPS[group] ?? DEFAULT_GROUP;
  const palettes = def.palettes.length > 0 ? def.palettes : DEFAULT_GROUP.palettes;
  const idx = hashString(seed ?? group ?? "x") % palettes.length;
  const palette = palettes[idx] ?? palettes[0];
  return {
    group: group || "Attività",
    emoji: def.emoji,
    font: def.font,
    tagline: def.tagline,
    heroSubtitle: def.heroSubtitle,
    palette,
    photoKeyword: def.photoKeyword,
    services: def.services,
    features: def.features,
    faqs: def.faqs,
    stats: def.stats,
    testimonial: def.testimonial,
    ctaLabel: def.ctaLabel,
    navLinks: NAV_LINKS,
  };
}
