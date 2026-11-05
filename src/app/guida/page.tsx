import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Guida",
  alternates: { canonical: "/guida" },
};
import {
  Rocket,
  Search,
  Users,
  MessageSquareText,
  PhoneCall,
  Zap,
  Sparkles,
  Globe,
  Camera,
  Map,
  CalendarDays,
  Receipt,
  Bell,
  ScrollText,
  Settings,
  ShieldCheck,
  BadgeCheck,
  Target,
} from "lucide-react";

type Section = { icon: React.ComponentType<{ className?: string }>; title: string; steps: string[] };

const SECTIONS: Section[] = [
  {
    icon: Rocket,
    title: "Primo avvio",
    steps: [
      "Installa le dipendenze: npm install",
      "Copia .env.example in .env, poi crea il database: npm run setup (template, tag e impostazioni di base: nessuna attivita di esempio viene inserita)",
      "Avvia l'app: npm run dev, poi apri http://localhost:3000",
      "Al primo avvio l'onboarding chiede brand e citta in cui cerchi i clienti: la citta viene geolocalizzata e diventa l'area delle ricerche. Puoi anche saltare il passaggio e compilarlo dopo in Impostazioni.",
      "(Opzionale) Per gli screenshot dei siti: npm run setup:screenshot",
    ],
  },
  {
    icon: Search,
    title: "1. Trovare i lead",
    steps: [
      "Vai su Ricerca lead nella sidebar.",
      "Scegli le categorie e l'area (citta, tutta la provincia o un singolo comune): la citta di partenza arriva dalle impostazioni salvate in onboarding.",
      "Seleziona le attivita interessanti e salvale: i duplicati vengono scartati in automatico.",
      "Hanno priorita piu alta le attivita senza sito e/o senza social.",
    ],
  },
  {
    icon: Users,
    title: "2. Gestire i lead (CRM)",
    steps: [
      "Apri CRM per vedere tutti i lead con punteggio e stato.",
      "Clicca un lead per aprirne la scheda: note, tag, contatti, stato.",
      "Cambia lo stato (Nuovo, Contattato, In trattativa, Cliente, Scartato).",
      "Usa le azioni massive per aggiornare piu lead insieme.",
      "Da qui parte anche la verifica in blocco: 'Verifica tutta la coda' o 'Verifica selezionati' controllano i dati a blocchi di 20 e mostrano l'avanzamento.",
    ],
  },
  {
    icon: Target,
    title: "2b. Coda delle opportunita (attivita senza sito)",
    steps: [
      "Apri Opportunita: elenca le attivita senza sito web ordinate per priorita.",
      "Filtra per citta e usa le azioni rapide chiamata, email o WhatsApp per partire subito.",
      "L'elenco e paginato: vedi una pagina alla volta, cosi resta veloce anche con centinaia di attivita.",
    ],
  },
  {
    icon: MessageSquareText,
    title: "3. Contattare (WhatsApp / Email)",
    steps: [
      "Dalla scheda lead scegli un modello di messaggio.",
      "Personalizza il testo a mano o con l'AI (Genera con AI).",
      "Apri WhatsApp o l'email gia precompilati e invia tu manualmente.",
      "Ogni invio viene registrato nel log attivita.",
    ],
  },
  {
    icon: Zap,
    title: "3b. Invio automatico email",
    steps: [
      "Vai su Messaggi: la card 'Invio automatico email' mostra quanti lead hanno un'email (con sito / senza sito).",
      "Spunta 'solo mai contattati' per evitare doppioni, poi clicca 'Invia ora a N lead'.",
      "Le email partono davvero via SMTP: a chi ha un sito proponi un restyling, a chi non ce l'ha un nuovo sito (il testo giusto viene scelto da solo).",
      "Richiede Email/SMTP in Impostazioni. Con Gmail invii circa 500 email al giorno: parti con pochi lead.",
    ],
  },
  {
    icon: PhoneCall,
    title: "3c. Telefonate a freddo (Cold call)",
    steps: [
      "Apri Cold call: per ogni lead con numero trovi uno script pronto e su misura (restyling se ha gia un sito, nuovo sito se non ce l'ha).",
      "Clicca Chiama per partire e leggi lo script: apertura, gancio, valore, obiezioni con risposta, chiusura con appuntamento.",
      "Usa 'Versione AI' per personalizzarlo, 'Copia script' per copiarlo e 'Segna chiamato' per registrare l'esito nel CRM.",
      "Attiva la 'Modalita sequenza' per chiamare un lead dopo l'altro, senza cercarli a mano.",
    ],
  },
  {
    icon: Globe,
    title: "4. Verifica stato del sito",
    steps: [
      "Nella scheda di un lead con sito web, apri la card Sito web.",
      "Clicca Verifica sito: l'app controlla se risponde, quanto e veloce e se e mobile-friendly.",
      "Lo stato viene aggiornato (ok / lento / datato / non raggiungibile) e annotato nel log.",
    ],
  },
  {
    icon: BadgeCheck,
    title: "4b. Verifica dei dati (email, telefono, indirizzo, social)",
    steps: [
      "Nella scheda lead premi 'Verifica ora': telefono, email, sito, indirizzo e social vengono controllati davvero, non a stima.",
      "L'email passa dalla risoluzione MX del dominio, il sito da una richiesta HTTP reale (con tempo di risposta), citta e indirizzi dal geocoding di OpenStreetMap.",
      "Ogni esito ha la sua fonte (OpenStreetMap, controllo diretto, ricerca web), una spiegazione leggibile e la data del controllo: verificato, da verificare, non raggiungibile, non valido, assente.",
      "Il riepilogo in cima dice quanti dati sono verificati e quanti restano da controllare, e segnala i possibili duplicati (stesso nome e stessa citta).",
      "Con 'Arricchisci contatti' l'app scarica la pagina del sito e ricava email e profili social pubblici: nessun dato viene inventato.",
    ],
  },
  {
    icon: Camera,
    title: "5. Screenshot del sito (opzionale)",
    steps: [
      "Richiede una volta sola: npm run setup:screenshot",
      "Nella card Sito web clicca Cattura per salvare un'anteprima reale della home.",
      "Utile da mostrare al cliente per fargli vedere com'e messo oggi.",
    ],
  },
  {
    icon: Receipt,
    title: "6. Anteprima del sito e pagamento ricevuto",
    steps: [
      "Dalla scheda lead clicca 'Genera sito (AI)' oppure apri 'Sito demo': con una chiave AI configurata viene creata un'anteprima UNICA e su misura (layout, colori e testi diversi per ogni attivita, mai 'sempre la stessa').",
      "Puoi dare istruzioni AI specifiche nella card del sito (es. 'aggiungi il menu', 'stile elegante e moderno').",
      "Senza chiave AI viene mostrata un'anteprima modello; per attivare l'AI vedi la sezione 'Chiavi AI'.",
      "Quando l'attivita ti paga, registra il pagamento in 'Ricevute di pagamento': numero, importo, metodo e data, con badge PAGATO pronto da stampare.",
    ],
  },
  {
    icon: Map,
    title: "7. Mappa",
    steps: [
      "Apri Mappa per vedere tutti i lead geolocalizzati.",
      "I marker sono colorati per priorita; filtra per stato/categoria/senza sito.",
      "Clicca un marker per aprire la scheda del lead.",
    ],
  },
  {
    icon: CalendarDays,
    title: "8. Follow-up & Calendario",
    steps: [
      "Programma un follow-up dalla scheda lead (canale + data + nota).",
      "In Calendario vedi promemoria in ritardo, di oggi e prossimi.",
      "Segna i follow-up come fatti quando li completi.",
    ],
  },
  {
    icon: Bell,
    title: "9. Notifiche & Log attivita",
    steps: [
      "La campanella in alto mostra le notifiche non lette.",
      "Apri Attivita per la cronologia completa, con filtri per tipo.",
    ],
  },
  {
    icon: Settings,
    title: "10. Impostazioni, Export & Backup",
    steps: [
      "In Impostazioni imposta i dati del tuo brand (usati in messaggi e ricevute di pagamento).",
      "Esporta i lead in CSV o importali da CSV (con dedup).",
      "Scarica un backup completo in JSON prima di modifiche importanti.",
    ],
  },
  {
    icon: Sparkles,
    title: "Chiavi AI (per far funzionare l'AI)",
    steps: [
      "In Impostazioni incolla una chiave gratuita: consigliata Google Gemini (gratis, senza carta di credito).",
      "Con la chiave salvata funzionano: generazione dei siti su misura, versione AI degli script cold call e testi dei messaggi.",
      "Senza chiave l'app resta usabile (script e sito modello sempre pronti), ma senza la personalizzazione dell'AI.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Uso corretto (GDPR)",
    steps: [
      "Raccogli solo dati pubblici e contatta in modo semi-automatico (decidi e invii tu).",
      "Indica sempre chi sei e offri una via di opt-out nei messaggi.",
      "Personalizza e contatta poche attivita per volta: niente invii di massa.",
    ],
  },
];

export default function GuidaPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Guida rapida</h1>
        <p className="text-muted-foreground">
          Come usare la piattaforma, passo per passo.
        </p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-primary" />
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  {s.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
