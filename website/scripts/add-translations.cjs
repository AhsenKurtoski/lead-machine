const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "messages");
const locales = ["en", "it", "de", "fr", "sl", "es", "pt"];

const data = {
  en: {
    cta: {
      title: "Ready to own your pipeline?",
      subtitle:
        "Deploy Lead Machine on your laptop in 3 commands — or self-host it anywhere. Free forever, no sign-up, no credit card.",
      primary: "Deploy Now — Free",
      secondary: "Star on GitHub",
    },
    deploy: { copied: "Copied to clipboard" },
    forms: {
      name: "Name",
      email: "Email",
      company: "Company (optional)",
      message: "Message",
      send: "Send",
      sending: "Sending…",
      successTitle: "Message sent",
      successDesc: "Thanks — we usually reply within 24 hours.",
      errorTitle: "Could not send",
      errorDesc: "Please check the fields and try again.",
      "demo-request": {
        title: "Request a Demo",
        subtitle: "See Lead Machine live: search, score, contact — in under 3 minutes.",
        cta: "Request Demo",
      },
      partnership: {
        title: "Partnerships",
        subtitle: "Let's grow the ecosystem together. Agencies, integrators, resellers — write to us.",
        cta: "Send proposal",
      },
      "report-issue": {
        title: "Report an Issue",
        subtitle: "Found a bug? Describe it and we'll fix it fast. Include your OS & browser.",
        cta: "Send report",
      },
      waitlist: {
        title: "Join the Waitlist",
        subtitle: "Be first in line for the hosted managed version, custom builds & early features.",
        cta: "Join Waitlist",
      },
    },
    resources: {
      docs: {
        title: "Documentation",
        subtitle: "Everything you need to install, configure and master Lead Machine.",
        body: "Step-by-step guides for local setup, VPS deployment, BYOK keys, AI providers (Gemini & Groq), SMTP and the quote pipeline. The full documentation lives in the repository's /docs folder and the README.",
      },
      blog: {
        title: "Blog",
        subtitle: "Stories, guides and field notes from the Lead Machine team.",
        body: "Articles about lead generation for freelancers, CRM workflows, self-hosting tips and open-source philosophy. New posts are announced on GitHub Discussions.",
      },
      changelog: {
        title: "Changelog",
        subtitle: "Every release, every fix, every new feature — in chronological order.",
        body: "We follow semantic versioning. Releases are published on GitHub Releases with detailed notes, migration steps and breaking-change warnings when applicable.",
      },
      roadmap: {
        title: "Roadmap",
        subtitle: "Where Lead Machine is going next.",
        body: "The roadmap is public and community-driven. Upvote ideas and suggest features in GitHub Discussions — we build what users actually need.",
      },
      contributors: {
        title: "Contributors",
        subtitle: "The people who make Lead Machine possible.",
        body: "Lead Machine is built by volunteers: developers, designers, translators and users who share their feedback. Every contribution is welcome — from docs fixes to new features.",
      },
      status: {
        title: "Status",
        subtitle: "Real-time status of all Lead Machine services.",
        body: "Lead Machine is an open-source project: there are no cloud servers to go down. The website, the code repository and community channels are maintained by volunteers. Report outages on GitHub.",
      },
      about: {
        title: "About",
        subtitle: "Why Lead Machine exists.",
        body: "We are freelancers who got tired of paying for tools that lock our data in the cloud. Lead Machine is our answer: a professional lead-generation stack that is free, private and open. It is developed in the open, used daily by its own maintainers.",
      },
    },
  },
  it: {
    cta: {
      title: "Pronto a possedere il tuo pipeline?",
      subtitle:
        "Installa Lead Machine sul tuo laptop in 3 comandi — o self-hosting ovunque. Gratis per sempre, senza registrazione, senza carta di credito.",
      primary: "Installa ora — Gratis",
      secondary: "Metti una stella su GitHub",
    },
    deploy: { copied: "Copiato negli appunti" },
    forms: {
      name: "Nome",
      email: "Email",
      company: "Azienda (facoltativo)",
      message: "Messaggio",
      send: "Invia",
      sending: "Invio in corso…",
      successTitle: "Messaggio inviato",
      successDesc: "Grazie — di solito rispondiamo entro 24 ore.",
      errorTitle: "Impossibile inviare",
      errorDesc: "Controlla i campi e riprova.",
      "demo-request": {
        title: "Richiedi una Demo",
        subtitle: "Guarda Lead Machine dal vivo: ricerca, punteggio, contatti — in meno di 3 minuti.",
        cta: "Richiedi demo",
      },
      partnership: {
        title: "Partnership",
        subtitle: "Facciamo crescere l'ecosistema insieme. Agenzie, integratori, rivenditori — scrivici.",
        cta: "Invia proposta",
      },
      "report-issue": {
        title: "Segnala un Problema",
        subtitle: "Hai trovato un bug? Descrivilo e lo sistemiamo subito. Includi sistema operativo e browser.",
        cta: "Invia segnalazione",
      },
      waitlist: {
        title: "Unisciti alla Waitlist",
        subtitle: "Sii tra i primi per la versione gestita, build personalizzate e funzionalità in anteprima.",
        cta: "Unisciti alla lista",
      },
    },
    resources: {
      docs: {
        title: "Documentazione",
        subtitle: "Tutto ciò che serve per installare, configurare e padroneggiare Lead Machine.",
        body: "Guide passo-passo per l'installazione locale, il deploy su VPS, le chiavi BYOK, i provider AI (Gemini e Groq), SMTP e il pipeline delle offerte. La documentazione completa vive nella cartella /docs del repository e nel README.",
      },
      blog: {
        title: "Blog",
        subtitle: "Storie, guide e appunti dal campo dal team di Lead Machine.",
        body: "Articoli sulla lead generation per freelance, flussi di lavoro CRM, consigli sul self-hosting e filosofia open source. I nuovi post vengono annunciati su GitHub Discussions.",
      },
      changelog: {
        title: "Changelog",
        subtitle: "Ogni release, ogni fix, ogni nuova funzione — in ordine cronologico.",
        body: "Seguiamo il versionamento semantico. Le release sono pubblicate su GitHub Releases con note dettagliate, passaggi di migrazione e avvisi di breaking change quando necessario.",
      },
      roadmap: {
        title: "Roadmap",
        subtitle: "Dove sta andando Lead Machine.",
        body: "La roadmap è pubblica e guidata dalla community. Vota le idee e suggerisci funzionalità su GitHub Discussions — costruiamo ciò di cui gli utenti hanno davvero bisogno.",
      },
      contributors: {
        title: "Contributori",
        subtitle: "Le persone che rendono possibile Lead Machine.",
        body: "Lead Machine è costruito da volontari: sviluppatori, designer, traduttori e utenti che condividono feedback. Ogni contributo è benvenuto — dai fix alla documentazione alle nuove funzionalità.",
      },
      status: {
        title: "Stato",
        subtitle: "Stato in tempo reale di tutti i servizi Lead Machine.",
        body: "Lead Machine è un progetto open source: non ci sono server cloud che possono andare giù. Il sito, il repository e i canali della community sono gestiti da volontari. Segnala i disservizi su GitHub.",
      },
      about: {
        title: "Chi Siamo",
        subtitle: "Perché esiste Lead Machine.",
        body: "Siamo freelance stanchi di pagare per strumenti che chiudono i nostri dati nel cloud. Lead Machine è la nostra risposta: uno stack professionale di lead generation gratuito, privato e aperto. Sviluppato in modo trasparente, usato ogni giorno dai suoi stessi manutentori.",
      },
    },
  },
  de: {
    cta: {
      title: "Bereit, deine Pipeline zu besitzen?",
      subtitle:
        "Installiere Lead Machine in 3 Befehlen auf deinem Laptop – oder hoste sie selbst überall. Für immer kostenlos, ohne Anmeldung, ohne Kreditkarte.",
      primary: "Jetzt installieren – Kostenlos",
      secondary: "Auf GitHub markieren",
    },
    deploy: { copied: "In die Zwischenablage kopiert" },
    forms: {
      name: "Name",
      email: "E-Mail",
      company: "Firma (optional)",
      message: "Nachricht",
      send: "Senden",
      sending: "Senden…",
      successTitle: "Nachricht gesendet",
      successDesc: "Danke – wir antworten in der Regel innerhalb von 24 Stunden.",
      errorTitle: "Senden fehlgeschlagen",
      errorDesc: "Bitte prüfe die Felder und versuche es erneut.",
      "demo-request": {
        title: "Demo anfragen",
        subtitle: "Sehen Sie Lead Machine live: suchen, bewerten, kontaktieren – in unter 3 Minuten.",
        cta: "Demo anfragen",
      },
      partnership: {
        title: "Partnerschaften",
        subtitle: "Lassen Sie uns das Ökosystem gemeinsam ausbauen. Agenturen, Integratoren, Reseller – schreiben Sie uns.",
        cta: "Vorschlag senden",
      },
      "report-issue": {
        title: "Problem melden",
        subtitle: "Einen Fehler gefunden? Beschreiben Sie ihn und wir beheben ihn schnell. Inklusive OS & Browser.",
        cta: "Meldung senden",
      },
      waitlist: {
        title: "Warteliste beitreten",
        subtitle: "Seien Sie Erster für die gehostete Version, Custom Builds & Early Features.",
        cta: "Warteliste beitreten",
      },
    },
    resources: {
      docs: {
        title: "Dokumentation",
        subtitle: "Alles, was Sie brauchen, um Lead Machine zu installieren, zu konfigurieren und zu meistern.",
        body: "Schritt-für-Schritt-Anleitungen für lokale Installation, VPS-Bereitstellung, BYOK-Schlüssel, AI-Anbieter (Gemini & Groq), SMTP und die Angebotspipeline. Die vollständige Dokumentation liegt im /docs-Ordner des Repos und in der README.",
      },
      blog: {
        title: "Blog",
        subtitle: "Geschichten, Anleitungen und Notizen aus dem Feld vom Lead-Machine-Team.",
        body: "Artikel über Lead-Generierung für Freelancer, CRM-Workflows, Self-Hosting-Tipps und Open-Source-Philosophie. Neue Beiträge werden auf GitHub Discussions angekündigt.",
      },
      changelog: {
        title: "Changelog",
        subtitle: "Jedes Release, jeder Fix, jede neue Funktion – in chronologischer Reihenfolge.",
        body: "Wir folgen Semantic Versioning. Releases werden auf GitHub Releases mit detaillierten Notizen, Migrationsschritten und Breaking-Change-Hinweisen veröffentlicht.",
      },
      roadmap: {
        title: "Roadmap",
        subtitle: "Wohin sich Lead Machine als Nächstes entwickelt.",
        body: "Die Roadmap ist öffentlich und community-getrieben. Bewerten Sie Ideen und schlagen Sie Funktionen in GitHub Discussions vor – wir bauen, was Nutzer wirklich brauchen.",
      },
      contributors: {
        title: "Mitwirkende",
        subtitle: "Die Menschen, die Lead Machine möglich machen.",
        body: "Lead Machine wird von Freiwilligen gebaut: Entwickler, Designer, Übersetzer und Nutzer, die Feedback teilen. Jeder Beitrag ist willkommen – von Docs-Fixes bis zu neuen Funktionen.",
      },
      status: {
        title: "Status",
        subtitle: "Echtzeit-Status aller Lead Machine-Dienste.",
        body: "Lead Machine ist ein Open-Source-Projekt: Es gibt keine Cloud-Server, die ausfallen können. Website, Code-Repository und Community-Kanäle werden von Freiwilligen gepflegt. Melden Sie Ausfälle auf GitHub.",
      },
      about: {
        title: "Über uns",
        subtitle: "Warum es Lead Machine gibt.",
        body: "Wir sind Freelancer, die es leid waren, für Tools zu zahlen, die unsere Daten in der Cloud einsperren. Lead Machine ist unsere Antwort: ein professioneller Lead-Generierungs-Stack, der kostenlos, privat und offen ist. In der Öffentlichkeit entwickelt, täglich von seinen Maintainern genutzt.",
      },
    },
  },
  fr: {
    cta: {
      title: "Prêt à posséder votre pipeline ?",
      subtitle:
        "Installez Lead Machine sur votre ordinateur en 3 commandes — ou hébergez-la vous-même. Gratuit pour toujours, sans inscription, sans carte bancaire.",
      primary: "Installer — Gratuit",
      secondary: "Mettre une étoile sur GitHub",
    },
    deploy: { copied: "Copié dans le presse-papiers" },
    forms: {
      name: "Nom",
      email: "E-mail",
      company: "Entreprise (facultatif)",
      message: "Message",
      send: "Envoyer",
      sending: "Envoi…",
      successTitle: "Message envoyé",
      successDesc: "Merci — nous répondons généralement sous 24 h.",
      errorTitle: "Échec de l'envoi",
      errorDesc: "Vérifiez les champs et réessayez.",
      "demo-request": {
        title: "Demander une démo",
        subtitle: "Découvrez Lead Machine en direct : recherche, scoring, contact — en moins de 3 minutes.",
        cta: "Demander une démo",
      },
      partnership: {
        title: "Partenariats",
        subtitle: "Faisons grandir l'écosystème ensemble. Agences, intégrateurs, revendeurs — écrivez-nous.",
        cta: "Envoyer la proposition",
      },
      "report-issue": {
        title: "Signaler un problème",
        subtitle: "Vous avez trouvé un bug ? Décrivez-le et nous le corrigeons vite. Indiquez votre OS & navigateur.",
        cta: "Envoyer le rapport",
      },
      waitlist: {
        title: "Rejoindre la liste d'attente",
        subtitle: "Soyez les premiers pour la version hébergée, les builds sur mesure et les nouveautés.",
        cta: "Rejoindre la liste",
      },
    },
    resources: {
      docs: {
        title: "Documentation",
        subtitle: "Tout ce qu'il faut pour installer, configurer et maîtriser Lead Machine.",
        body: "Guides étape par étape pour l'installation locale, le déploiement VPS, les clés BYOK, les fournisseurs d'IA (Gemini & Groq), SMTP et le pipeline de devis. La documentation complète vit dans le dossier /docs du dépôt et dans le README.",
      },
      blog: {
        title: "Blog",
        subtitle: "Histoires, guides et notes de terrain de l'équipe Lead Machine.",
        body: "Articles sur la génération de leads pour freelances, les flux CRM, les conseils self-hosting et la philosophie open source. Les nouveaux articles sont annoncés sur GitHub Discussions.",
      },
      changelog: {
        title: "Journal des versions",
        subtitle: "Chaque version, chaque correctif, chaque nouvelle fonctionnalité — par ordre chronologique.",
        body: "Nous suivons le versioning sémantique. Les versions sont publiées sur GitHub Releases avec des notes détaillées, des étapes de migration et des avertissements de breaking changes.",
      },
      roadmap: {
        title: "Feuille de route",
        subtitle: "Où va Lead Machine ensuite.",
        body: "La feuille de route est publique et pilotée par la communauté. Votez pour les idées et proposez des fonctionnalités dans GitHub Discussions — nous construisons ce dont les utilisateurs ont réellement besoin.",
      },
      contributors: {
        title: "Contributeurs",
        subtitle: "Les personnes qui rendent Lead Machine possible.",
        body: "Lead Machine est construit par des bénévoles : développeurs, designers, traducteurs et utilisateurs qui partagent leurs retours. Chaque contribution est la bienvenue — des corrections de docs aux nouvelles fonctionnalités.",
      },
      status: {
        title: "Statut",
        subtitle: "Statut en temps réel de tous les services Lead Machine.",
        body: "Lead Machine est un projet open source : il n'y a aucun serveur cloud susceptible de tomber. Le site, le dépôt de code et les canaux communautaires sont maintenus par des bénévoles. Signalez les pannes sur GitHub.",
      },
      about: {
        title: "À propos",
        subtitle: "Pourquoi Lead Machine existe.",
        body: "Nous sommes des freelances fatigués de payer pour des outils qui enferment nos données dans le cloud. Lead Machine est notre réponse : une stack professionnelle de génération de leads, gratuite, privée et ouverte. Développée en open source, utilisée chaque jour par ses propres mainteneurs.",
      },
    },
  },
  es: {
    cta: {
      title: "¿Listo para tener tu pipeline?",
      subtitle:
        "Instala Lead Machine en tu portátil con 3 comandos, o haz self-hosting en cualquier lugar. Gratis para siempre, sin registro, sin tarjeta.",
      primary: "Instalar ahora — Gratis",
      secondary: "Deja una estrella en GitHub",
    },
    deploy: { copied: "Copiado al portapapeles" },
    forms: {
      name: "Nombre",
      email: "Correo electrónico",
      company: "Empresa (opcional)",
      message: "Mensaje",
      send: "Enviar",
      sending: "Enviando…",
      successTitle: "Mensaje enviado",
      successDesc: "Gracias — solemos responder en 24 horas.",
      errorTitle: "No se pudo enviar",
      errorDesc: "Revisa los campos e inténtalo de nuevo.",
      "demo-request": {
        title: "Solicitar una demo",
        subtitle: "Ve Lead Machine en vivo: búsqueda, puntuación, contacto — en menos de 3 minutos.",
        cta: "Solicitar demo",
      },
      partnership: {
        title: "Alianzas",
        subtitle: "Hagamos crecer el ecosistema juntos. Agencias, integradores, revendedores — escríbenos.",
        cta: "Enviar propuesta",
      },
      "report-issue": {
        title: "Reportar un problema",
        subtitle: "¿Encontraste un error? Descríbelo y lo arreglamos rápido. Incluye tu SO y navegador.",
        cta: "Enviar informe",
      },
      waitlist: {
        title: "Unirse a la lista de espera",
        subtitle: "Sé de los primeros en la versión gestionada, builds personalizados y funciones anticipadas.",
        cta: "Unirse a la lista",
      },
    },
    resources: {
      docs: {
        title: "Documentación",
        subtitle: "Todo lo necesario para instalar, configurar y dominar Lead Machine.",
        body: "Guías paso a paso para la instalación local, despliegue en VPS, claves BYOK, proveedores de IA (Gemini y Groq), SMTP y el pipeline de presupuestos. La documentación completa vive en la carpeta /docs del repositorio y en el README.",
      },
      blog: {
        title: "Blog",
        subtitle: "Historias, guías y notas de campo del equipo de Lead Machine.",
        body: "Artículos sobre generación de leads para freelancers, flujos de CRM, consejos de self-hosting y filosofía open source. Los nuevos posts se anuncian en GitHub Discussions.",
      },
      changelog: {
        title: "Registro de cambios",
        subtitle: "Cada versión, cada fix, cada nueva función — en orden cronológico.",
        body: "Seguimos versionado semántico. Las versiones se publican en GitHub Releases con notas detalladas, pasos de migración y avisos de breaking changes.",
      },
      roadmap: {
        title: "Hoja de ruta",
        subtitle: "Hacia dónde va Lead Machine.",
        body: "La hoja de ruta es pública y guiada por la comunidad. Vota ideas y sugiere funciones en GitHub Discussions: construimos lo que los usuarios realmente necesitan.",
      },
      contributors: {
        title: "Colaboradores",
        subtitle: "Las personas que hacen posible Lead Machine.",
        body: "Lead Machine está construido por voluntarios: desarrolladores, diseñadores, traductores y usuarios que comparten sus comentarios. Toda contribución es bienvenida, desde arreglos de docs hasta nuevas funciones.",
      },
      status: {
        title: "Estado",
        subtitle: "Estado en tiempo real de todos los servicios de Lead Machine.",
        body: "Lead Machine es un proyecto open source: no hay servidores en la nube que puedan caerse. El sitio, el repositorio y los canales de la comunidad son mantenidos por voluntarios. Reporta caídas en GitHub.",
      },
      about: {
        title: "Acerca de",
        subtitle: "Por qué existe Lead Machine.",
        body: "Somos freelancers cansados de pagar por herramientas que encierran nuestros datos en la nube. Lead Machine es nuestra respuesta: un stack profesional de generación de leads gratuito, privado y abierto. Desarrollado en abierto, usado a diario por sus propios mantenedores.",
      },
    },
  },
  pt: {
    cta: {
      title: "Pronto para ter o seu pipeline?",
      subtitle:
        "Instale o Lead Machine no seu laptop em 3 comandos — ou faça self-host em qualquer lugar. Grátis para sempre, sem cadastro, sem cartão.",
      primary: "Instalar agora — Grátis",
      secondary: "Deixa uma estrela no GitHub",
    },
    deploy: { copied: "Copiado para a área de transferência" },
    forms: {
      name: "Nome",
      email: "E-mail",
      company: "Empresa (opcional)",
      message: "Mensagem",
      send: "Enviar",
      sending: "Enviando…",
      successTitle: "Mensagem enviada",
      successDesc: "Obrigado — normalmente respondemos em 24 horas.",
      errorTitle: "Não foi possível enviar",
      errorDesc: "Verifique os campos e tente novamente.",
      "demo-request": {
        title: "Solicitar uma demo",
        subtitle: "Veja o Lead Machine ao vivo: pesquisa, score, contato — em menos de 3 minutos.",
        cta: "Solicitar demo",
      },
      partnership: {
        title: "Parcerias",
        subtitle: "Vamos fazer o ecossistema crescer juntos. Agências, integradores, revendedores — escreva-nos.",
        cta: "Enviar proposta",
      },
      "report-issue": {
        title: "Reportar um problema",
        subtitle: "Encontrou um bug? Descreva-o e nós corrigimos rápido. Inclua seu sistema e navegador.",
        cta: "Enviar relatório",
      },
      waitlist: {
        title: "Entrar na lista de espera",
        subtitle: "Seja o primeiro na versão gerenciada, builds personalizados e recursos antecipados.",
        cta: "Entrar na lista",
      },
    },
    resources: {
      docs: {
        title: "Documentação",
        subtitle: "Tudo o que precisa para instalar, configurar e dominar o Lead Machine.",
        body: "Guias passo a passo para instalação local, deploy em VPS, chaves BYOK, provedores de IA (Gemini e Groq), SMTP e o pipeline de orçamentos. A documentação completa vive na pasta /docs do repositório e no README.",
      },
      blog: {
        title: "Blog",
        subtitle: "Histórias, guias e notas de campo da equipe Lead Machine.",
        body: "Artigos sobre geração de leads para freelancers, fluxos de CRM, dicas de self-hosting e filosofia open source. Novos posts são anunciados no GitHub Discussions.",
      },
      changelog: {
        title: "Registro de mudanças",
        subtitle: "Cada versão, cada correção, cada novo recurso — em ordem cronológica.",
        body: "Seguimos versionamento semântico. As versões são publicadas no GitHub Releases com notas detalhadas, passos de migração e avisos de breaking changes.",
      },
      roadmap: {
        title: "Roadmap",
        subtitle: "Para onde o Lead Machine vai a seguir.",
        body: "O roadmap é público e orientado pela comunidade. Vote em ideias e sugira recursos no GitHub Discussions — construímos o que os usuários realmente precisam.",
      },
      contributors: {
        title: "Contribuidores",
        subtitle: "As pessoas que tornam o Lead Machine possível.",
        body: "O Lead Machine é construído por voluntários: desenvolvedores, designers, tradutores e usuários que compartilham feedback. Toda contribuição é bem-vinda — de correções na doc a novos recursos.",
      },
      status: {
        title: "Status",
        subtitle: "Status em tempo real de todos os serviços do Lead Machine.",
        body: "O Lead Machine é um projeto open source: não há servidores na nuvem que possam cair. O site, o repositório e os canais da comunidade são mantidos por voluntários. Reporte quedas no GitHub.",
      },
      about: {
        title: "Sobre",
        subtitle: "Por que o Lead Machine existe.",
        body: "Somos freelancers cansados de pagar por ferramentas que prendem nossos dados na nuvem. O Lead Machine é a nossa resposta: um stack profissional de geração de leads gratuito, privado e aberto. Desenvolvido em aberto, usado diariamente pelos seus próprios mantenedores.",
      },
    },
  },
  sl: {
    cta: {
      title: "Pripravljen na svoj prodajni lijak?",
      subtitle:
        "Namestite Lead Machine na prenosnik s 3 ukazi — ali gostite sami kjer koli. Zastonj za vedno, brez registracije, brez kartice.",
      primary: "Namesti zdaj — Brezplačno",
      secondary: "Zvezdica na GitHubu",
    },
    deploy: { copied: "Kopirano v odložišče" },
    forms: {
      name: "Ime",
      email: "E-pošta",
      company: "Podjetje (neobvezno)",
      message: "Sporočilo",
      send: "Pošlji",
      sending: "Pošiljanje…",
      successTitle: "Sporočilo poslano",
      successDesc: "Hvala — običajno odgovorimo v 24 urah.",
      errorTitle: "Ni mogoče poslati",
      errorDesc: "Preverite polja in poskusite znova.",
      "demo-request": {
        title: "Zahtevaj demo",
        subtitle: "Oglejte si Lead Machine v živo: iskanje, ocenjevanje, stik — v manj kot 3 minutah.",
        cta: "Zahtevaj demo",
      },
      partnership: {
        title: "Partnerstva",
        subtitle: "Skupaj razvijajmo ekosistem. Agencije, integratorji, preprodajalci — pišite nam.",
        cta: "Pošlji predlog",
      },
      "report-issue": {
        title: "Prijavi težavo",
        subtitle: "Ste našli napako? Opišite jo in jo bomo hitro odpravili. Vključite OS in brskalnik.",
        cta: "Pošlji prijavo",
      },
      waitlist: {
        title: "Pridruži se čakalni listi",
        subtitle: "Bodite prvi za gostovano različico, prilagojene namestitve in zgodnje funkcije.",
        cta: "Pridruži se listi",
      },
    },
    resources: {
      docs: {
        title: "Dokumentacija",
        subtitle: "Vse, kar potrebujete za namestitev, nastavitev in obvladovanje Lead Machine.",
        body: "Vodniki po korakih za lokalno namestitev, namestitev na VPS, BYOK ključe, AI ponudnike (Gemini in Groq), SMTP in ponudbeni tok. Celotna dokumentacija je v mapi /docs repozitorija in v README.",
      },
      blog: {
        title: "Blog",
        subtitle: "Zgodbe, vodniki in terenske opombe ekipe Lead Machine.",
        body: "Članki o pridobivanju strank za samostojne podjetnike, CRM tokovih, nasvetih za lastno gostovanje in odprtokodni filozofiji. Novi prispevki so objavljeni na GitHub Discussions.",
      },
      changelog: {
        title: "Dnevnik sprememb",
        subtitle: "Vsaka izdaja, vsak popravek, vsaka nova funkcija — v kronološkem vrstnem redu.",
        body: "Sledimo semantičnemu različkomanju. Izdaje so objavljene na GitHub Releases s podrobnimi opombami, koraki migracije in opozorili o spremembah, ki rušijo združljivost.",
      },
      roadmap: {
        title: "Načrt",
        subtitle: "Kam gre Lead Machine naprej.",
        body: "Načrt je javen in ga vodi skupnost. Glasujte za ideje in predlagajte funkcije na GitHub Discussions — gradimo tisto, kar uporabniki res potrebujejo.",
      },
      contributors: {
        title: "Sodelavci",
        subtitle: "Ljudje, ki omogočajo Lead Machine.",
        body: "Lead Machine gradijo prostovoljci: razvijalci, oblikovalci, prevajalci in uporabniki, ki delijo povratne informacije. Vsak prispevek je dobrodošel — od popravkov dokumentacije do novih funkcij.",
      },
      status: {
        title: "Stanje",
        subtitle: "Stanje vseh storitev Lead Machine v realnem času.",
        body: "Lead Machine je odprtokodni projekt: ni oblačnih strežnikov, ki bi lahko padli. Spletno mesto, repozitorij in skupnostni kanali jih vzdržujejo prostovoljci. Izpade prijavite na GitHubu.",
      },
      about: {
        title: "O projektu",
        subtitle: "Zakaj obstaja Lead Machine.",
        body: "Smo samostojni podjetniki, naveličani plačevanja orodij, ki naše podatke zapirajo v oblak. Lead Machine je naš odgovor: profesionalni sklop za pridobivanje strank, brezplačen, zaseben in odprt. Razvit javno, vsak dan ga uporabljajo njegovi vzdrževalci.",
      },
    },
  },
};

for (const locale of locales) {
  const file = path.join(dir, `${locale}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));

  json.cta = data[locale].cta;
  json.deploy = { ...json.deploy, ...data[locale].deploy };
  json.forms = data[locale].forms;
  json.resources = data[locale].resources;

  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(`Updated ${locale}.json`);
}

console.log("Done.");
