-- D1 seed: mirrors prisma/seed.ts.
-- Apply after migrations:
--   npm run cf:seed:local
--   npm run cf:seed:remote
-- No sample leads are inserted.

DELETE FROM "MessageTemplate"
WHERE "name" IN (
  'WhatsApp - Primo contatto (no sito)',
  'WhatsApp - Sito da migliorare (restyling)',
  'WhatsApp - Presenza social',
  'Email - Proposta sito web (no sito)',
  'Email - Proposta restyling (ha gia un sito)'
);

INSERT INTO "MessageTemplate" ("id", "name", "channel", "subject", "body", "isDefault", "createdAt", "updatedAt") VALUES
(
  'seed-wa-no-sito',
  'WhatsApp - Primo contatto (no sito)',
  'whatsapp',
  NULL,
  'Salve [nome], sono [io_nome], web developer della zona di [citta]. Ho visto che la vostra attivita ([categoria]) non ha ancora un sito web e mi sono permesso di preparare un''anteprima gratuita, costruita sui vostri dati reali, per mostrarvi come potreste apparire online. Posso inviarvela qui senza alcun impegno: la guardate con calma e mi dite cosa ne pensate. Seguo personalmente ogni progetto, passo dopo passo. Quando posso mandarvela?',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'seed-wa-restyling',
  'WhatsApp - Sito da migliorare (restyling)',
  'whatsapp',
  NULL,
  'Salve [nome], sono [io_nome], web developer della zona di [citta]. Ho dato un''occhiata al vostro sito attuale: con pochi accorgimenti (grafica piu moderna, velocita e visibilita su Google) potrebbe rendere molto di piu e portarvi nuovi clienti. Mi piacerebbe proporvi un restyling su misura, a un costo contenuto. Posso prepararvi gratuitamente un''anteprima di come lo rinnoverei? Me ne occupo io di persona.',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'seed-wa-social',
  'WhatsApp - Presenza social',
  'whatsapp',
  NULL,
  'Salve [nome], sono [io_nome], web developer della zona di [citta]. Vi seguo gia sui social, complimenti! Per un''attivita come la vostra ([categoria]) un vero sito web, collegato ai social, darebbe molta piu credibilita e vi farebbe trovare su Google da chi vi cerca. Posso mostrarvi gratis e senza impegno un''anteprima di come potrebbe essere. Ve la preparo?',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'seed-email-no-sito',
  'Email - Proposta sito web (no sito)',
  'email',
  'Un''anteprima di sito web gratuita per [nome]',
  'Gentile [nome],

mi chiamo [io_nome] e sono un web developer che segue personalmente le attivita di [citta] e dintorni.

Ho notato che [nome] non ha ancora un sito web e ho preparato per voi un''anteprima gratuita e senza impegno, costruita sui vostri dati reali: cosi potete vedere con i vostri occhi come apparireste online, su computer e smartphone.

Non sono un''agenzia che vi tratta come un numero: lavoro da solo e seguo ogni cliente di persona, dall''idea alla pubblicazione.

Se l''idea vi piace, rispondete a questa email oppure chiamatemi al [io_telefono]: vi mostro subito l''anteprima.

Un cordiale saluto,
[io_nome]
[io_attivita]

---
Ricevete questa email in quanto attivita presente in elenchi pubblici. Se non desiderate altre comunicazioni, rispondete con OPT-OUT e non vi scrivero piu.',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'seed-email-restyling',
  'Email - Proposta restyling (ha gia un sito)',
  'email',
  'Un''idea per rinnovare il sito di [nome]',
  'Gentile [nome],

mi chiamo [io_nome], sono un web developer della zona di [citta] e seguo personalmente ogni progetto.

Ho visto il sito attuale di [nome]: ha delle buone basi, ma con un restyling mirato (design piu moderno, caricamento veloce, ottimizzazione per smartphone e per Google) potrebbe portarvi molti piu contatti, con un investimento contenuto.

Posso prepararvi gratuitamente un''anteprima di come lo rinnoverei, cosi valutate senza impegno.

Per qualsiasi cosa rispondete a questa email o chiamatemi al [io_telefono].

Un cordiale saluto,
[io_nome]
[io_attivita]

---
Ricevete questa email in quanto attivita presente in elenchi pubblici. Se non desiderate altre comunicazioni, rispondete con OPT-OUT e non vi scrivero piu.',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO "Tag" ("id", "name", "color") VALUES
  ('seed-tag-caldo', 'Caldo', '#ef4444'),
  ('seed-tag-da-richiamare', 'Da richiamare', '#f59e0b'),
  ('seed-tag-referral', 'Referral', '#10b981')
ON CONFLICT("name") DO UPDATE SET "color" = excluded."color";
