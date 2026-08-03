# Instagram Reels Production Guide — "Lead Machine in 60 seconds"

Goal: a **60-second, 9:16 vertical Reel** that shows a freelancer going from "I need clients" → "I have a ranked list of nearby prospects" → "I'm contacting them with AI help" → "I just generated a PDF quote and invoice". Hook-heavy, fast cuts (2–4s each), clear screen recording + overlay text in the viewer's language (post separate localised Reels with the same video, or use the one Italian master + English subtitles).

This guide is split into:
1. Pre-production (15 min),
2. Screen recording (10 minutes of raw footage → trimmed to 60s),
3. Editing in CapCut / Premiere Rush (free tools),
4. Captions, hashtags, caption copy.

---

## 1. Pre-production

### 1.1 Technical specs for Instagram Reels

| Property | Value |
|---|---|
| Aspect ratio | **9:16 vertical** (1080×1920 px). Letterbox / crops lose reach. |
| Duration | **45–60 seconds** — Instagram pushes 60s Reels hard (better watch-time). |
| Frame rate | **30 fps** (60 is fine too, but 30 is smaller). |
| Resolution | **1080×1920 minimum** — 4K source is fine, export 1080. |
| Codec | H.264 (`.mp4`), AAC audio, 10–20 Mbps. |
| Audio | -16 LUFS integrated, peak ≤ -1 dB (Reels will auto-normalise to ~-14; keep music bed under voice-over). |
| Safe zones | Title/captions in the middle **1080×1400 area** (avoid top 300px UI chrome, bottom 220px Reels navigation). |

### 1.2 Pre-record checklist

1. Use a **real smartphone viewport / responsive desktop capture window at 9:16 crop** if recording from desktop.
   - Easiest: in Chrome, DevTools → device toolbar → set custom device: `1080×1920`, DPR 1, set device type "Mobile". Record the 9:16 frame with OBS / Screen Studio / Loom.
   - Alternative: record the app on your real iPhone or Android at 9:16 (the app is fully responsive).
2. Run `npm run db:seed` on a **fresh, clean state** (no client data, sample Feltre data is perfect).
3. Set UI language in-app to match the Reel you're recording (e.g. IT for the Italian master, EN for the international post).
4. Close every browser extension, turn on Do-not-disturb. Hide bookmarks bar. Use a clean profile.
5. **Pre-save your credentials masks**. In the demo we're not showing real API keys — the settings screen will show `••••••••` by design. Great.

### 1.3 Shot list (60 s exactly, 17 beats @ ~3.5 s each)

Each "shot" is one continuous clip. Cut on motion.

| # | Time | Visual (on screen) | Voice-over (V.O.) | Overlay text (big, bold, 1 line max) |
|---|---|---|---|---|
| 01 | 0:00–0:03 | Black → cut to YOU (phone selfie cam) looking concerned. Your laptop in background shows an empty calendar. | *"Tired of paying €200/month just to find local clients?"* | STOP paying for CRMs 💸 |
| 02 | 0:03–0:07 | Cut to Lead Machine logo splash screen (or browser loading localhost:3000 → dashboard KPI row with euro numbers) | *"What if your entire sales stack cost… **zero**?"* | 100% Open Source • MIT License |
| 03 | 0:07–0:11 | Open **Ricerca** page. Enter: `Città: Feltre`, `Raggio: 5 km`, `Categorie: "ristoranti, bar, negozi"` (fast typing, maybe show keyboard overlay). Click "Cerca su OpenStreetMap". | *"First — find every nearby business on OpenStreetMap… for free."* | Find leads in 1 click · 5 km radius |
| 04 | 0:11–0:15 | Research results table appears. Scrolling fast through 40–50 results. Score badges 92, 78, 64… | *"…in 2 seconds you get 47 candidates, each with a priority score 0–100."* | AI Priority score (0–100) |
| 05 | 0:15–0:19 | Click "Importa tutti nel CRM". Success toast `+45 lead creati`. | *"One click — and they're all in your CRM, deduplicated."* | Bulk import · auto dedupe |
| 06 | 0:19–0:23 | Switch to **Mappa**. Pinch to zoom into Feltre. Clusters expand. Tap a pin → popover with name + email + "Contatta" button. | *"See them geographically on a free OSM map. No Google Maps key."* | Interactive map view (Leaflet) |
| 07 | 0:23–0:27 | CRM list with score filter set to `>60`. Click a row for the detail drawer. Timeline with appuntamenti. | *"CRM, timeline, tags, statuses, reminders — everything built in."* | Full CRM + timeline + follow-ups |
| 08 | 0:27–0:31 | Click the 🌐 Globe dropdown. Pick Deutsch (DE), then English (US), then Français. UI re-renders instantly. Bonus: show dates/currency formatting changing. | *"Oh — and it speaks 7 languages. Germany, France, USA, Slovenia, Spain, Portugal… pick yours."* | 7 languages · EUR & USD · Dates |
| 09 | 0:31–0:35 | Open a lead's "Cerca sito web" bulk action. 12 leads → website, email, phone extracted. Screenshot preview. | *"Website crawl, email extraction, homepage screenshot — automated."* | Auto-find emails & phones + screenshots |
| 10 | 0:35–0:39 | Open lead → press **"Genera script chiamata (AI)"**. Result appears in 1 second. (Use a seeded Groq/Gemini key for the demo.) | *"Cold call panic? AI writes the perfect 30-second elevator pitch for you."* | AI script (Groq · Gemini · failover) |
| 11 | 0:39–0:43 | Open one lead. Click **"WhatsApp"** → opens `wa.me` in a split second with pre-filled text. Quick tap → send. Then "Email" → pre-filled email draft popover. | *"Reach out on WhatsApp, email, phone. One click each. No app-switching."* | Call · Email · WhatsApp · 1 tap |
| 12 | 0:43–0:48 | Click **"Nuovo preventivo"** for the same lead. Pre-fill from price list: 3 line items → total, 22% VAT, 30-day validity. | *"When they say yes — make a professional quote, in Euro or USD, with PDF."* | Line-item quotes · VAT · PDF |
| 13 | 0:48–0:51 | Click **"Scarica PDF"** — download animation. Show PDF preview. Nice branded header with logo, company VAT, footer. | *"Branded PDF. Your client gets it in 30 seconds by email."* | 1-click PDF · brandable |
| 14 | 0:51–0:54 | Click **"Converti in Fattura"** → **"Segna pagato"**. Revenue widget on dashboard animates up +€4.800. | *"Accept → invoice → mark paid. Watch the revenue graph grow."* | Invoicing · Revenue tracking |
| 15 | 0:54–0:57 | Dashboard wide shot — charts: leads by month, heatmap, funnel, tags. | *"Dashboards, reports, exports — everything a freelancer actually needs."* | Reports · Exports · 0 cost |
| 16 | 0:57–0:59 | Cut back to you, smiling, giving the 👍 to camera. Laptop shows: "MIT License · Free Forever · Lead Machine". | *"Stop renting your sales tool. Own it."* | Free forever · Own your data |
| 17 | 0:59–1:00 | End card: project logo + GitHub URL (QR code on screen linking to repo). Hold for ~1 s, fade to black. | *[no V.O.]* | github.com/lead-machine/lead-machine · ↗️ |

### 1.4 Music bed

Use any **upbeat, instrumental, mid-BPM** track. Good sources:
- Instagram's own royalty-free audio library (search "lofi tech", "calm motivational", "indie pop instrumental").
- Epidemic Sound / Artlist if you have a sub.
- Uppbeat (free tier) → "Upbeat Lo-fi" / "Glitch Pop".

**Rules:**
- Duck the music **-20 dB** under the voice-over so the words are 100% intelligible.
- Keep the V.O. up-front at ~-15 LUFS. No music with lyrics — attention splits.
- Have a clear "whoosh" sound design on cuts if you want (CapCut has free SFX: "Transitions → Glitch" or "Swoosh").

---

## 2. Recording the master (desktop → 9:16)

### 2.1 Tools

Either:
- **CapCut Desktop** with its built-in screen recorder → crop 1080×1920 at end, or
- **OBS Studio** (free): set Base (Canvas) Resolution = 1080×1920, Output Res = 1080×1920. Capture "Chrome window". Crop Chrome to 9:16 vertical viewport with DevTools device mode.

### 2.2 Window setup

- Chrome DevTools → Toggle device toolbar → Edit → Add custom device:
  - Width: `1080`, Height: `1920`, Device pixel ratio: `1.5` or `1`, User agent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1`.
- Zoom in on the Chrome tab so buttons are touchable (125% is good).
- Move tab so the *only thing captured* is the 9:16 viewport — no browser chrome.

### 2.3 Voice-over recording

- Record the whole 60 s script **in one continuous take**, then cut the video to the audio (this is the Hollywood trick). Makes everything tighter.
- Use your **phone on a mic stand 15 cm from your mouth** into Voice Memos or CapCut. Or a cheap USB mic (Blue Yeti Nano / Samson Q2U).
- Environment: soft room, closed door. Carpet + blankets kill reverb.
- Speak clearly, slightly on the faster side (~160 words/min). Smile while reading — it warms the tone.
- In post, add a 3-band EQ: cut 200 Hz by ~3 dB, add ~2 dB at 3–4 kHz for clarity, gentle high-shelf 8 kHz. Then a limiter -3 dB.

---

## 3. Editing timeline (CapCut step-by-step)

1. Create new project, **aspect ratio 9:16**.
2. **Import 3 things**: (a) VO audio track, (b) all 17 raw screen clips, (c) selfie cam clips 01 and 16.
3. **Align the VO to the timeline first**. Snap cuts to word boundaries using waveforms.
4. Drop each B-roll / screen recording clip under its VO line.
5. Use these **transitions** (keep it tasteful — don't use CapCut's default zoomed templates):
   - Hard cuts for UI changes,
   - A 6-frame "Cross blur" or "Film dissolve" only between non-UI beats (e.g. cut 01 → 02, cut 15 → 16).
6. **Text overlays**:
   - CapCut → Text → Default text, per shot.
   - Font: **"Montserrat ExtraBold"** or **"Poppins Black"**, size 54–60 px, white 100% with a **2–3 px pure black stroke** (so it's legible on any background).
   - Drop shadow, 100% black, 50% opacity, 4px offset.
   - Anchor to **BOTTOM of the safe middle area** (leave 220 px from bottom edge).
7. **Captions / subtitles**:
   - CapCut → **Auto captions → From original audio → Language: (your VO lang)**.
   - Enable "Highlight every word" option (yellow highlight, Instagram loves this).
   - Reposition to be **above the overlay text** (but still inside the safe zone).
8. **Punch-ins (Ken Burns) on UI details**: For beats 03, 05, 12, 14 — 500 ms of 1.1× zoom into the button you're clicking. Makes it feel like an Apple demo.
9. **Color grading**: slight saturation +4, contrast +3, sharpness +8 on UI clips. Face-lift preset on selfie clips.
10. **End card**: 1 s still frame with GitHub logo URL and a **clickable QR code** (go to qr-code-monkey.com → paste the repo URL, export transparent PNG 512×512, drop in the corner).

### 3.1 Export

- Preset: **1080p · 30 fps · Recommended quality** (H.264).
- Turn ON: **"Export with caption" baked in** (hard subs are better for watch-through on mute).
- File size should be **40–80 MB**.

---

## 4. Caption copy + hashtags + posting strategy

### 4.1 Italian master caption

```
💸 Smetti di pagare 200 €/mese per CRM, lead finder, email, fatture elettroniche.

Questa piattaforma open-source (MIT — quindi GRATUITA per sempre) in 1 minuto:
✅ trova i locali intorno a te su OpenStreetMap
✅ assegna uno score di priorità 0–100
✅ scrive il tuo script di chiamata a freddo con l'AI
✅ ti fa mandare WhatsApp/email/chiamata in 1 click
✅ crea preventivi + fatture PDF con IVA e marca da bollo
✅ parla 7 lingue (IT, DE, FR, SL, EN, ES, PT)

Tutto sul tuo PC. SQLite portatile.
Nessun cloud obbligatorio, nessun lock-in.
Nessuna sottoscrizione. Mai.

👉 Link in bio / link nel commento fissato: GitHub repo + README passo passo per installarlo in 5 comandi.

Mi aiuti a condividerlo? Un ❤️ e un RTSAVE per favore 🥹

#LeadMachine #OpenSource #FreelanceItalia #WebDeveloper #CRM #LeadGeneration #PiccoleImprese #PartitaIVA #MarketingLocale #FatturazioneElettronica #MITLicense #Nextjs #SQLite #ShadcnUI
```

### 4.2 English master caption (for the @global account or 2nd post)

```
Stop paying $250/mo for a lead gen SaaS that locks your data.

This fully open-source (MIT, free forever) Next.js app does your whole freelance sales stack in ~60 seconds:

✅ Finds nearby businesses on OpenStreetMap (free)
✅ Assigns an AI priority score 0–100
✅ Drafts your cold-call script & outreach email
✅ 1-click WhatsApp / call / email
✅ Branded PDF quotes + invoices (VAT-aware, multi-currency)
✅ 7 UI languages · WCAG-friendly · offline-capable

Everything runs on YOUR laptop with a portable SQLite DB.
No mandatory cloud, no lock-in, no subscriptions. Ever.

👉 Link in bio for the GitHub repo + 5-step setup.

Drop a 🔥 if you want to stop renting your sales tools.

#LeadMachine #OpenSourceCRM #FreelanceTools #WebDev #LeadGen #SmallBusinessTools #SaaSAlternative #MITLicense #NextJS #IndieHacker #BuildInPublic #Solopreneur #SalesAutomation
```

### 4.3 Hashtag mix (cap at ~20 total, mix of big + niche)

English: `#OpenSource #CRM #LeadGeneration #FreelanceLife #SmallBusiness #WebDeveloper #SalesAutomation #Solopreneur #IndieHacker #NextJS #TailwindCSS #Prisma #SelfHosted #NoSubscription #BuildInPublic #DevCommunity #ProductivityHacks #BusinessAutomation #Entrepreneur #TechTool`

Italiano: `#PartitaIVA #FreelanceItalia #WebDeveloperItalia #CRMOpenSource #LeadGenerationItalia #FatturazioneElettronica #PiccoleImprese #LiberiProfessionisti #AgenziaWeb #SviluppoSoftware #ItaliaDigitale #MarketingLocale #VendereOnline #StrumentiGratis #AlternativaSaaS #ImprenditoriaDigitale #DeveloperItaliani #StartupItalia #Automazione #MITLicense`

### 4.4 Posting rhythm for maximum discoverability

- **Post 1 (day 0)**: 60 s master (🇮🇹 VO + IT captions). Tag @InstagramForCreators, @github, @theprismaio, @tailwindcss, @vercel — some of them repost open-source product launches.
- **Post 2 (day 2)**: same video, **English VO or hard-subs EN** + EN caption. Push it to Reels Explore in EN markets.
- **Post 3 (day 5)**: a **15-second cut** of beats 01–05, 08, 14, 16, 17. Hook: *"€0/mo, but it finds all your local clients for you."* → Link.
- **Story (every day 0–7)**:
  - Day 0: 3 s teaser + "Link in bio".
  - Day 2: poll sticker: "What's your biggest freelance pain? 🔴 Finding clients / ⚫ Chasing invoices / 🟣 Both".
  - Day 4: Q&A sticker: "Ask me anything about this app → I'll reply as Stories".
  - Day 7: "Repo reached N stars — thank you!" screenshot.
- **Collabs**: send the raw Reel to creator friends in dev/indie/freelance niches, ask them to Duet/Remix ("Is €200/mo for a CRM too much?").

### 4.5 Instagram "profile scrub" around launch (10 min)

For the launch week:
- Change your bio link to `https://github.com/lead-machine/lead-machine` (or a Linktree that opens to it first).
- Add a story Highlight called "FREE CRM" with the Reel + Q&A answers.
- Pin the Reel to your profile grid top.

---

## 5. Optional: short-format out-takes content (3 more Reels from the same footage)

1. **"How to install Lead Machine in 5 commands" (15 s)**, text overlay commands one by one.
2. **"The AI cold-call script feature is wild…" (30 s)**, 3 examples of before/after — you reading the generic elevator pitch vs the AI one.
3. **"18 € SaaS vs 0 € Open Source" (30 s split screen)** — side-by-side HubSpot pricing page vs. Lead Machine dashboard with the same features.

---

Have fun filming! And if you post it, **tag the repo team** (@leadmachine on X/Threads/IG, or link the repo in the comments) — we'll share the best ones on the project socials. <3
