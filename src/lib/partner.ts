// ============================================================
// Configurazione Partner / Sviluppo Esterno
// ============================================================

export type TechPartner = {
  name: string;
  legalName: string;
  tagline: string;
  website: string;
  email: string;
  phone: string;
  location: string;
  address: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  founded: string;
  cin: string;
  status: string;
  ceo: string;
  directors: string[];
  instagram: string;
  linkedin: string;
  teamSize: string;
  services: string[];
  technologies: string[];
  industries: string[];
  process: string[];
  clientNote: string;
};

export const TECH_PARTNER: TechPartner = {
  name: "Team di Sviluppo",
  legalName: "Team Interno",
  tagline: "Empowering Digital Transformation Together",
  website: "",
  email: "",
  phone: "",
  location: "Europa",
  address: "",
  city: "",
  region: "",
  country: "",
  postalCode: "",
  founded: "",
  cin: "",
  status: "Attiva",
  ceo: "",
  directors: [],
  instagram: "",
  linkedin: "",
  teamSize: "",
  services: [
    "Sviluppo web app",
    "Sviluppo app mobile",
    "Design UI/UX",
    "Digital marketing",
  ],
  technologies: [
    "React.js",
    "Node.js",
  ],
  industries: [],
  process: [
    "Analisi e pianificazione",
    "Design e sviluppo",
    "Test e rilascio",
    "Manutenzione e supporto",
  ],
  clientNote:
    "La progettazione, i contatti e lo sviluppo tecnico sono gestiti direttamente dal nostro team " +
    "specializzato in siti web, app e piattaforme su misura: questo ci permette di offrire qualità premium.",
};
