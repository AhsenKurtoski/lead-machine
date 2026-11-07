// scripts/demo-gif.mjs — registra una passeggiata REALE del prodotto e genera
// il video MP4 + il GIF usato dal README.
//
// Uso:
//   1. npm run build && APP_PASSWORD=... PORT=3111 npm start
//   2. APP_PASSWORD=... node scripts/demo-gif.mjs [baseUrl]
// Output:
//   docs/assets/lead-machine-demo.mp4   (1920x1080, H.264 + AAC)
//   docs/assets/lead-machine-demo.gif   (versione leggera per il README)
// Opzionale:
//   DEMO_DESKTOP_DIR=C:/Users/... copia l'MP4 anche sul Desktop.
//
// Requisiti: Playwright/Chromium (npm run setup:screenshot) e ffmpeg/ffprobe
// nel PATH (con libx264, libass e AAC). La musica e' generata qui, nota per
// nota: nessun campione esterno e nessun problema di licenza.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const outDir = path.join(root, "docs", "assets");
fs.mkdirSync(outDir, { recursive: true });

const base = (process.argv[2] || process.env.BASE_URL || "http://127.0.0.1:3111").replace(/\/$/, "");
const password = process.env.APP_PASSWORD || process.env.DEMO_PASSWORD || "";
if (!password) {
  console.error("APP_PASSWORD non impostata: il video deve partire da una sessione autenticata.");
  process.exit(1);
}

const W = 1920;
const H = 1080;
const FPS = 30;
const XFADE = 0.6;
const work = fs.mkdtempSync(path.join(root, ".demo-work-"));
const mp4Path = path.join(outDir, "lead-machine-demo.mp4");
const gifPath = path.join(outDir, "lead-machine-demo.gif");
const keepWork = process.env.DEMO_KEEP === "1";

function run(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : "";
    console.error(`\n${bin} ha fallito.\n${stderr.slice(-4000)}`);
    throw error;
  }
}

function ff(args) {
  return run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
}

function probeDuration(file) {
  return Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      file,
    ]).trim()
  );
}

function assertTools() {
  try {
    run("ffmpeg", ["-version"]);
    run("ffprobe", ["-version"]);
  } catch {
    throw new Error("ffmpeg e ffprobe devono essere nel PATH.");
  }
}

async function login(page) {
  await page.goto(base + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill("#password", password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("domcontentloaded");
}

const CURSOR_SCRIPT = () => {
  const install = () => {
    if (document.getElementById("__lead_machine_cursor")) return;
    const style = document.createElement("style");
    style.textContent =
      "::-webkit-scrollbar{width:0!important;height:0!important}html{scrollbar-width:none!important}";
    document.documentElement.appendChild(style);

    const cursor = document.createElement("div");
    cursor.id = "__lead_machine_cursor";
    Object.assign(cursor.style, {
      position: "fixed",
      left: "50%",
      top: "50%",
      width: "22px",
      height: "22px",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.94)",
      border: "2px solid rgba(7,20,33,0.9)",
      boxShadow: "0 4px 18px rgba(0,0,0,0.35), 0 0 0 5px rgba(45,212,191,0.16)",
      transform: "translate(-50%, -50%)",
      transition: "transform 90ms ease-out",
      pointerEvents: "none",
      zIndex: "2147483647",
    });
    document.documentElement.appendChild(cursor);

    window.addEventListener(
      "mousemove",
      (event) => {
        cursor.style.left = event.clientX + "px";
        cursor.style.top = event.clientY + "px";
      },
      true
    );
    window.addEventListener(
      "mousedown",
      () => {
        cursor.style.transform = "translate(-50%, -50%) scale(0.72)";
      },
      true
    );
    window.addEventListener(
      "mouseup",
      () => {
        cursor.style.transform = "translate(-50%, -50%) scale(1)";
      },
      true
    );
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
};

async function move(page, x, y, steps = 22) {
  await page.mouse.move(x, y, { steps });
  await page.waitForTimeout(240);
}

async function center(page, locator, fallback = { x: 1100, y: 520 }) {
  try {
    const box = await locator.first().boundingBox({ timeout: 2500 });
    if (box) return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  } catch {
    // Il selettore puo' non esserci su una pagina diversa: si usa il fallback.
  }
  return fallback;
}

async function renderCard(file, html) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await page.screenshot({ path: file });
  } finally {
    await context.close();
  }
}

function brandCard({ kicker, title, subtitle, footer, accent = "#2dd4bf", align = "left" }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
  body{background:#06111d;color:#f8fafc;font-family:"Segoe UI",Inter,system-ui,sans-serif}
  .bg{position:absolute;inset:0;background:
    radial-gradient(900px 620px at 12% 18%, rgba(45,212,191,.20), transparent 62%),
    radial-gradient(760px 520px at 88% 82%, rgba(245,181,68,.14), transparent 62%),
    linear-gradient(135deg,#071521 0%,#0b2130 55%,#07111c 100%)}
  .grid{position:absolute;inset:0;opacity:.5;background-image:
    linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);
    background-size:80px 80px;
    mask-image:radial-gradient(900px 620px at 40% 40%,#000 20%,transparent 78%)}
  .content{position:absolute;left:${align === "center" ? "50%" : "120px"};top:50%;transform:translate(${align === "center" ? "-50%,-50%" : "0,-50%"});
    width:${align === "center" ? "1280px" : "1120px"};${align === "center" ? "text-align:center;" : ""}}
  .brand{display:flex;align-items:center;gap:18px;font-size:22px;font-weight:700;letter-spacing:.22em;color:#dbeafe;margin-bottom:44px;${align === "center" ? "justify-content:center;" : ""}}
  .mark{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;font-size:21px;letter-spacing:0;
    background:linear-gradient(135deg,${accent},#0f766e);color:#03151b;box-shadow:0 12px 40px rgba(45,212,191,.25)}
  .kicker{font-size:20px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:${accent};margin-bottom:18px}
  h1{font-size:${align === "center" ? "82px" : "78px"};line-height:1.02;letter-spacing:-.045em;margin:0 0 28px;font-weight:800}
  h1 span{color:${accent}}
  p{font-size:28px;line-height:1.45;color:#b9cad8;margin:0;max-width:960px;${align === "center" ? "margin-left:auto;margin-right:auto;" : ""}}
  .footer{position:absolute;left:120px;right:120px;bottom:78px;display:flex;align-items:center;justify-content:space-between;
    font-size:18px;letter-spacing:.04em;color:#8fa7ba}
  .pill{display:inline-flex;align-items:center;gap:10px;margin-top:38px;padding:12px 20px;border:1px solid rgba(255,255,255,.16);
    border-radius:999px;background:rgba(255,255,255,.06);font-size:17px;color:#d8e6ef}
  .dot{width:8px;height:8px;border-radius:999px;background:${accent};box-shadow:0 0 16px ${accent}}
  .panel{position:absolute;right:120px;top:50%;transform:translateY(-50%);width:480px;padding:34px;border:1px solid rgba(255,255,255,.14);
    border-radius:28px;background:rgba(9,28,42,.72);box-shadow:0 30px 90px rgba(0,0,0,.35);backdrop-filter:blur(12px)}
  .panel .eyebrow{font-size:13px;letter-spacing:.2em;color:#8fa7ba;text-transform:uppercase}
  .panel .big{font-size:72px;font-weight:800;letter-spacing:-.04em;margin:8px 0 4px}
  .panel .muted{font-size:16px;color:#9fb4c4}
  .bars{display:flex;gap:10px;align-items:flex-end;height:150px;margin-top:28px}
  .bar{flex:1;border-radius:10px 10px 4px 4px;background:linear-gradient(180deg,${accent},rgba(45,212,191,.12))}
  .row{display:flex;align-items:center;justify-content:space-between;margin-top:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,.1);font-size:16px;color:#c7d7e2}
  .ok{color:${accent};font-weight:700}
</style></head><body>
  <div class="bg"></div><div class="grid"></div>
  <div class="content">
    <div class="brand"><div class="mark">LM</div><span>LEAD MACHINE</span></div>
    <div class="kicker">${kicker}</div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <div class="pill"><span class="dot"></span>${footer}</div>
  </div>
  ${align === "center" ? "" : `<div class="panel">
    <div class="eyebrow">Pipeline locale</div>
    <div class="big">134</div>
    <div class="muted">attività nel CRM</div>
    <div class="bars">
      <div class="bar" style="height:38%"></div><div class="bar" style="height:56%"></div>
      <div class="bar" style="height:48%"></div><div class="bar" style="height:78%"></div>
      <div class="bar" style="height:66%"></div><div class="bar" style="height:94%"></div>
      <div class="bar" style="height:72%"></div>
    </div>
    <div class="row"><span>Campi verificati</span><span class="ok">63</span></div>
    <div class="row"><span>Senza sito web</span><span class="ok">105</span></div>
  </div>`}
</body></html>`;
}

const INTRO_HTML = brandCard({
  kicker: "Dati reali, nessuna simulazione",
  title: "Trova le attività<br><span>che hanno bisogno di te.</span>",
  subtitle:
    "Lead generation locale, verifica dei contatti e CRM. Ricerca, opportunità e follow-up in un'unica app che gira sul tuo computer.",
  footer: "Demo del prodotto · 2026",
  accent: "#2dd4bf",
});

const OUTRO_HTML = brandCard({
  kicker: "Open source · local-first · SQLite",
  title: "Meno ricerca.<br><span>Più clienti.</span>",
  subtitle:
    "Lead Machine trova le attività della tua città, verifica i dati e ti porta dal primo contatto alla ricevuta.",
  footer: "github.com/AhsenKurtoski/lead-machine",
  accent: "#f5b544",
  align: "center",
});

let browser;

async function recordScene(config) {
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    colorScheme: "light",
    storageState: config.storageState,
    recordVideo: { dir: work, size: { width: W, height: H } },
  });
  await context.addInitScript(CURSOR_SCRIPT);
  let page;
  try {
    page = await context.newPage();
    if (config.consoleErrors) {
      page.on("console", (message) => {
        if (message.type() === "error") config.consoleErrors.add(message.text());
      });
    }
    await page.goto(base + config.route, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (page.url().includes("/login")) throw new Error(`sessione non valida su ${config.route}`);
    await page.locator("main").first().waitFor({ state: "visible", timeout: 20000 });
    await page.waitForTimeout(1400);
    await move(page, 980, 520, 1);
    await config.action(page);
    await page.waitForTimeout(config.tail ?? 1200);
    const video = page.video();
    await context.close();
    const src = await video.path();
    const dest = path.join(work, config.name + ".webm");
    fs.renameSync(src, dest);
    return dest;
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
}

function normalizeFilter() {
  return "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x06111d,setsar=1,fps=30,format=yuv420p";
}

function normalizeClip(src, dest, offset, duration) {
  ff([
    "-i",
    src,
    "-ss",
    offset.toFixed(3),
    "-t",
    duration.toFixed(3),
    "-vf",
    normalizeFilter(),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    dest,
  ]);
}

function imageClip(src, dest, duration) {
  ff([
    "-loop",
    "1",
    "-i",
    src,
    "-t",
    duration.toFixed(3),
    "-vf",
    normalizeFilter(),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    dest,
  ]);
}

function assTime(seconds) {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const cs = Math.round((safe - Math.floor(safe)) * 100);
  const pad = (n, size = 2) => String(n).padStart(size, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(Math.min(cs, 99))}`;
}

function buildAss(events) {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Lower,Segoe UI,38,&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,-1,0,0,0,100,100,0,0,3,14,0,1,110,110,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const lines = events.map((event) => {
    const text =
      `{\\fad(280,280)\\an1\\pos(110,1000)\\fs20\\c&H00CFD42D&\\b1}LEAD MACHINE\\N` +
      `{\\fs38\\c&H00FFFFFF&}${event.title}\\N` +
      `{\\fs22\\c&H00D6E4EA&\\b0}${event.subtitle}`;
    return `Dialogue: 0,${assTime(event.start)},${assTime(event.end)},Lower,,0,0,0,,${text}`;
  });
  return header + lines.join("\n") + "\n";
}

function writeMusic(file, duration, transitions) {
  const sr = 48000;
  const total = Math.ceil(duration * sr) + sr;
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const bar = 2.6;
  const beat = bar / 4;
  const chords = [
    { bass: 33, notes: [57, 60, 64] }, // La minore
    { bass: 29, notes: [53, 57, 60] }, // Fa
    { bass: 36, notes: [55, 60, 64] }, // Do
    { bass: 31, notes: [55, 59, 62] }, // Sol
  ];
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function addTone(start, length, frequency, amplitude, pan, waveform = "sine", attack = 0.08, release = 0.2) {
    const from = Math.max(0, Math.floor(start * sr));
    const to = Math.min(total, Math.floor((start + length) * sr));
    const leftGain = Math.cos(((pan + 1) * Math.PI) / 4);
    const rightGain = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = from; i < to; i++) {
      const t = (i - from) / sr;
      const progress = t / Math.max(0.001, length);
      const envelope =
        Math.min(1, t / Math.max(0.001, attack)) *
        Math.min(1, Math.max(0, (1 - progress) / Math.max(0.001, release / length)));
      const phase = 2 * Math.PI * frequency * t;
      let sample = Math.sin(phase);
      if (waveform === "soft") sample = Math.sin(phase) + 0.22 * Math.sin(2 * phase) + 0.08 * Math.sin(3 * phase);
      if (waveform === "pluck") sample = Math.sin(phase) + 0.35 * Math.sin(2 * phase);
      const value = sample * envelope * amplitude;
      left[i] += value * leftGain;
      right[i] += value * rightGain;
    }
  }

  function addKick(start, amplitude = 0.16) {
    const from = Math.max(0, Math.floor(start * sr));
    const to = Math.min(total, from + Math.floor(0.26 * sr));
    for (let i = from; i < to; i++) {
      const t = (i - from) / sr;
      const env = Math.exp(-t * 18);
      const freq = 92 * Math.exp(-t * 22) + 38;
      const value = Math.sin(2 * Math.PI * freq * t) * env * amplitude;
      left[i] += value;
      right[i] += value;
    }
  }

  function addNoise(start, length, amplitude, pan = 0) {
    const from = Math.max(0, Math.floor(start * sr));
    const to = Math.min(total, Math.floor((start + length) * sr));
    const leftGain = Math.cos(((pan + 1) * Math.PI) / 4);
    const rightGain = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = from; i < to; i++) {
      const t = (i - from) / sr;
      const env = Math.exp(-t * 34);
      const value = (Math.random() * 2 - 1) * env * amplitude;
      left[i] += value * leftGain;
      right[i] += value * rightGain;
    }
  }

  const bars = Math.ceil(duration / bar) + 1;
  for (let b = 0; b < bars; b++) {
    const chord = chords[b % chords.length];
    const start = b * bar;
    const padLength = bar * 1.02;
    for (const note of chord.notes) {
      addTone(start, padLength, midi(note), 0.045, -0.45, "soft", 0.65, 0.9);
      addTone(start, padLength, midi(note) * 1.002, 0.04, 0.45, "soft", 0.7, 0.9);
    }
    addTone(start, bar * 0.92, midi(chord.bass), 0.11, 0, "sine", 0.03, 0.28);

    const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
    for (let step = 0; step < 8; step++) {
      const note = chord.notes[pattern[step]] + 12;
      const at = start + step * (bar / 8) + 0.01;
      addTone(at, bar / 7.5, midi(note), 0.028, step % 2 ? 0.55 : -0.55, "pluck", 0.006, 0.18);
    }

    for (let step = 0; step < 4; step++) {
      addKick(start + step * beat, step === 0 ? 0.17 : 0.12);
      addNoise(start + step * beat + beat * 0.5, 0.055, 0.018, step % 2 ? 0.65 : -0.65);
    }
    addNoise(start + beat * 1.5, 0.09, 0.028, -0.2);
    addNoise(start + beat * 3.5, 0.09, 0.03, 0.2);
  }

  for (const transition of transitions) {
    const start = Math.max(0, transition - 0.32);
    const length = 0.72;
    const from = Math.floor(start * sr);
    const to = Math.min(total, Math.floor((start + length) * sr));
    for (let i = from; i < to; i++) {
      const t = (i - from) / sr;
      const p = t / length;
      const env = Math.sin(Math.PI * p) ** 2;
      const sweep = Math.sin(2 * Math.PI * (180 + 520 * p) * t);
      const value = (sweep * 0.7 + (Math.random() * 2 - 1) * 0.3) * env * 0.035;
      left[i] += value * (1 - p * 0.4);
      right[i] += value * (0.6 + p * 0.4);
    }
  }

  // Riverbero leggero: due delay corti, poi normalizzazione e fade.
  const delayA = Math.floor(0.19 * sr);
  const delayB = Math.floor(0.31 * sr);
  const wetL = left.slice();
  const wetR = right.slice();
  for (let i = delayA; i < total; i++) {
    left[i] += wetL[i - delayA] * 0.15 + wetL[i - delayB] * 0.08;
    right[i] += wetR[i - delayA] * 0.14 + wetR[i - delayB] * 0.075;
  }

  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const gain = peak > 0 ? 0.88 / peak : 1;
  const fadeIn = 1.2 * sr;
  const fadeOutStart = Math.max(0, total - 2.2 * sr);
  for (let i = 0; i < total; i++) {
    let fade = 1;
    if (i < fadeIn) fade = i / fadeIn;
    if (i > fadeOutStart) fade = Math.max(0, (total - i) / (total - fadeOutStart));
    left[i] *= gain * fade;
    right[i] *= gain * fade;
  }

  const samples = total;
  const buffer = Buffer.alloc(44 + samples * 4);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 4, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sr, 24);
  buffer.writeUInt32LE(sr * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 4, 40);
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767))), offset);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767))), offset + 2);
    offset += 4;
  }
  fs.writeFileSync(file, buffer);
}

function buildVideo(clips, music, assFile) {
  const inputs = clips.flatMap((clip) => ["-i", clip.file]);
  const parts = clips.map((_, i) => `[${i}:v]setpts=PTS-STARTPTS,format=yuv420p[v${i}]`);
  let last = "v0";
  let end = clips[0].duration;
  for (let i = 1; i < clips.length; i++) {
    const offset = Math.max(0, end - XFADE);
    parts.push(
      `[${last}][v${i}]xfade=transition=fade:duration=${XFADE.toFixed(3)}:offset=${offset.toFixed(3)}[x${i}]`
    );
    last = `x${i}`;
    end = offset + clips[i].duration;
  }
  const assPath = assFile.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
  parts.push(
    `[${last}]fade=t=in:st=0:d=0.8,fade=t=out:st=${Math.max(0, end - 0.9).toFixed(3)}:d=0.9,subtitles=filename='${assPath}'[vout]`
  );
  const audioIndex = clips.length;
  parts.push(
    `[${audioIndex}:a]loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0, end - 1.5).toFixed(3)}:d=1.5[aout]`
  );

  ff([
    ...inputs,
    "-i",
    music,
    "-filter_complex",
    parts.join(";"),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-t",
    end.toFixed(3),
    "-r",
    String(FPS),
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-level",
    "4.2",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    mp4Path,
  ]);
  return end;
}

function makeGif() {
  const candidates = [
    { fps: 10, width: 960, seconds: 30, maxColors: 128 },
    { fps: 8, width: 840, seconds: 28, maxColors: 96 },
    { fps: 8, width: 720, seconds: 26, maxColors: 96 },
  ];
  for (const candidate of candidates) {
    ff([
      "-t",
      String(candidate.seconds),
      "-i",
      mp4Path,
      "-vf",
      `fps=${candidate.fps},scale=${candidate.width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${candidate.maxColors}:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`,
      "-loop",
      "0",
      "-an",
      gifPath,
    ]);
    const mb = fs.statSync(gifPath).size / 1024 / 1024;
    if (mb <= 11.5 || candidate === candidates[candidates.length - 1]) {
      return { ...candidate, mb };
    }
  }
}

async function main() {
  assertTools();
  const health = await fetch(base + "/api/health", { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!health || !health.ok) throw new Error(`server non raggiungibile su ${base}/api/health`);

  browser = await chromium.launch();
  let authContext;
  let storageState;
  try {
    authContext = await browser.newContext({ viewport: { width: W, height: H } });
    const authPage = await authContext.newPage();
    await login(authPage);
    storageState = await authContext.storageState();
    if (!storageState.cookies.length) throw new Error("login riuscito ma nessun cookie salvato");
  } finally {
    await authContext?.close();
  }

  const introPng = path.join(work, "intro.png");
  const outroPng = path.join(work, "outro.png");
  await renderCard(introPng, INTRO_HTML);
  await renderCard(outroPng, OUTRO_HTML);

  const consoleErrors = new Set();
  const searchState = { ok: false };
  const sceneSpecs = [
    {
      name: "01-dashboard",
      route: "/dashboard",
      label: "Dashboard",
      subtitle: "La pipeline in un colpo d'occhio",
      duration: 5.2,
      offset: 1.3,
      action: async (page) => {
        await move(page, 1260, 320);
        await page.mouse.wheel(0, 260);
        await page.waitForTimeout(750);
        await page.mouse.wheel(0, -180);
        await move(page, 1000, 700);
      },
    },
    {
      name: "02-ricerca",
      route: "/ricerca",
      label: "Ricerca sul territorio",
      subtitle: "Attività reali da OpenStreetMap",
      duration: 5.6,
      offset: "tail",
      action: async (page) => {
        const category = page.locator("button").filter({ hasText: /^Ristorante$/ }).first();
        if (await category.count()) await category.click();
        await move(page, 460, 900);
        const searchButton = page.locator("button").filter({ hasText: /Cerca attivita/ }).first();
        if (await searchButton.count()) {
          await searchButton.click();
          // Una sola categoria tiene la ricerca leggera; il taglio finale del
          // clip parte dai risultati, non dalla rotella di caricamento.
          await page
            .locator("text=attivita trovate")
            .first()
            .waitFor({ state: "visible", timeout: 30000 })
            .then(() => {
              searchState.ok = true;
            })
            .catch(() => {});
          await page.waitForTimeout(1200);
        }
        if (searchState.ok) {
          // I risultati stanno sotto i filtri: senza questo scorrimento il
          // video mostrerebbe solo il pannello delle categorie.
          await page.mouse.wheel(0, 620);
          await page.waitForTimeout(900);
          const firstResult = page.locator("tbody tr").first();
          if (await firstResult.count()) {
            const point = await center(page, firstResult, { x: 860, y: 620 });
            await move(page, point.x, point.y);
          }
        }
      },
    },
    {
      name: "03-crm",
      route: "/crm/cmulgc0u40005m5xcl8hj2e6c",
      label: "Scheda lead",
      subtitle: "Verifica i contatti, non fidarti dei dati",
      duration: 5.8,
      offset: 1.2,
      action: async (page) => {
        const verify = page.locator("button").filter({ hasText: /Verifica ora/ }).first();
        const point = await center(page, verify, { x: 1030, y: 510 });
        await move(page, point.x, point.y);
        await page.waitForTimeout(1400);
        await page.mouse.wheel(0, 220);
        await page.waitForTimeout(700);
      },
    },
    {
      name: "04-mappa",
      route: "/mappa",
      label: "Mappa",
      subtitle: "Il territorio, senza foglio di calcolo",
      duration: 5.0,
      offset: 1.5,
      action: async (page) => {
        await page.locator(".leaflet-container").first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
        await move(page, 1180, 470);
        await page.waitForTimeout(1800);
        await move(page, 1320, 560, 18);
      },
    },
    {
      name: "05-opportunita",
      route: "/opportunita",
      label: "Opportunità",
      subtitle: "Chi non ha un sito, prima di tutti",
      duration: 5.2,
      offset: 1.2,
      action: async (page) => {
        await move(page, 980, 790);
        await page.mouse.wheel(0, 360);
        await page.waitForTimeout(900);
        await move(page, 700, 760);
      },
    },
    {
      name: "06-ricevuta",
      route: "/ricevuta",
      label: "Ricevute",
      subtitle: "Dal contatto al pagamento",
      duration: 5.2,
      offset: 1.2,
      action: async (page) => {
        await move(page, 720, 430);
        await page.mouse.wheel(0, 220);
        await page.waitForTimeout(700);
        await move(page, 980, 620);
      },
    },
    {
      name: "07-impostazioni",
      route: "/impostazioni",
      label: "Impostazioni",
      subtitle: "Il tuo brand, la tua città",
      duration: 5.2,
      offset: 1.2,
      action: async (page) => {
        await move(page, 930, 420);
        await page.mouse.wheel(0, 260);
        await page.waitForTimeout(700);
        await move(page, 1110, 560);
      },
    },
  ];

  const recorded = [];
  for (const spec of sceneSpecs) {
    process.stdout.write(`Registro ${spec.label}... `);
    const src = await recordScene({
      name: spec.name,
      route: spec.route,
      storageState,
      consoleErrors,
      action: spec.action,
      tail: 1400,
    });
    if (spec.name === "02-ricerca" && !searchState.ok) {
      console.log("scartata: la ricerca live non ha restituito risultati in tempo");
      continue;
    }
    const actual = probeDuration(src);
    const offset = spec.offset === "tail" ? Math.max(1.2, actual - spec.duration - 1.2) : spec.offset;
    const duration = Math.max(2.5, Math.min(spec.duration, actual - offset - 0.2));
    const normalized = path.join(work, spec.name + ".mp4");
    normalizeClip(src, normalized, offset, duration);
    recorded.push({ ...spec, file: normalized, duration });
    console.log(`ok (${actual.toFixed(1)}s registrati, ${duration.toFixed(1)}s in timeline)`);
  }

  const introClip = path.join(work, "00-intro.mp4");
  const outroClip = path.join(work, "08-outro.mp4");
  imageClip(introPng, introClip, 3.8);
  imageClip(outroPng, outroClip, 4.4);

  const clips = [
    { file: introClip, duration: 3.8, label: null },
    ...recorded.map((scene) => ({ file: scene.file, duration: scene.duration, label: scene })),
    { file: outroClip, duration: 4.4, label: null },
  ];

  let cursor = 0;
  const lowerThirdEvents = [];
  const transitions = [];
  for (let i = 0; i < clips.length; i++) {
    if (i > 0) {
      cursor += clips[i - 1].duration - XFADE;
      transitions.push(cursor);
    }
    if (clips[i].label) {
      lowerThirdEvents.push({
        start: cursor + 0.35,
        end: cursor + clips[i].duration - 0.35,
        title: clips[i].label.label,
        subtitle: clips[i].label.subtitle,
      });
    }
  }
  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0) - XFADE * (clips.length - 1);

  const assFile = path.join(work, "lower-thirds.ass");
  fs.writeFileSync(assFile, buildAss(lowerThirdEvents), "utf8");
  const music = path.join(work, "music.wav");
  writeMusic(music, totalDuration, transitions);

  console.log(`Monto ${totalDuration.toFixed(1)}s con ${clips.length} segmenti...`);
  buildVideo(clips, music, assFile);
  const gif = makeGif();

  const meta = JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      mp4Path,
    ])
  );
  const video = meta.streams.find((stream) => stream.codec_type === "video");
  const audio = meta.streams.find((stream) => stream.codec_type === "audio");
  if (!video || video.width !== W || video.height !== H) {
    throw new Error(`video non 1080p: ${video?.width}x${video?.height}`);
  }
  if (!audio || audio.codec_name !== "aac") {
    throw new Error("traccia audio AAC mancante");
  }

  const mb = (file) => (fs.statSync(file).size / 1024 / 1024).toFixed(1);
  console.log(`✅ ${mp4Path} (${mb(mp4Path)} MB, ${Number(meta.format.duration).toFixed(1)}s, ${video.width}x${video.height}, ${audio.codec_name})`);
  console.log(`✅ ${gifPath} (${mb(gifPath)} MB, ${gif.fps}fps, ${gif.width}px, primi ${gif.seconds}s)`);

  if (consoleErrors.size) {
    console.log(`⚠️  ${consoleErrors.size} errori console durante il tour:`);
    for (const error of [...consoleErrors].slice(0, 8)) console.log(`   ${error}`);
  } else {
    console.log("✅ Nessun errore console durante il tour.");
  }

  const desktopDir = process.env.DEMO_DESKTOP_DIR;
  if (desktopDir) {
    fs.mkdirSync(desktopDir, { recursive: true });
    const target = path.join(desktopDir, "Lead-Machine-Demo.mp4");
    fs.copyFileSync(mp4Path, target);
    console.log(`✅ Copiato su ${target}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(`Errore nella generazione del video: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  if (!keepWork) fs.rmSync(work, { recursive: true, force: true });
  else console.log(`File di lavoro conservati in ${work}`);
}
