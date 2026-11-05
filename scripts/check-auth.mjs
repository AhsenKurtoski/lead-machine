// ============================================================
// Verifica automatica di autenticazione, CSRF, header e fail-closed.
//
// Avvia due server di produzione su loopback:
//   1. con APP_PASSWORD: login, cookie, sessione, CSRF, header, pagina /health;
//   2. senza APP_PASSWORD: deve rispondere 503 a tutto tranne /login e /api/health,
//      anche falsificando Host: localhost o Host: example.com.
//
// Non tocca il database se non leggendo la pagina /health. Non stampa mai la
// password. Richiede una build (`npm run build`) e un database (`npm run setup`).
// ============================================================

import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const ROOT = process.cwd();
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const BUILD_ID = path.join(ROOT, ".next", "BUILD_ID");
const PORT = Number(process.env.AUTH_CHECK_PORT || 3211);
const NO_PASSWORD_PORT = PORT + 1;
const PASSWORD = process.env.AUTH_CHECK_PASSWORD || `auth-check-${Math.random().toString(36).slice(2)}-pass`;

let passes = 0;
let failures = 0;
let withPassword = null;
let withoutPassword = null;

function record(name, passed, detail = "") {
  if (passed) {
    passes += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function startServer(port, password) {
  const child = spawn(
    process.execPath,
    [NEXT_BIN, "start", "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        APP_PASSWORD: password,
        PORT: String(port),
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    }
  );
  child.__errorTail = "";
  const collect = (chunk) => {
    child.__errorTail = (child.__errorTail + chunk.toString()).slice(-6000);
  };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  return child;
}

async function waitForServer(child, port) {
  const url = `http://127.0.0.1:${port}/api/health`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Il server sulla porta ${port} è uscito con codice ${child.exitCode}.\n${child.__errorTail}`);
    }
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status === 200) return;
    } catch {
      // Il server non è ancora in ascolto.
    }
    await delay(500);
  }
  throw new Error(`Il server sulla porta ${port} non è diventato pronto.\n${child.__errorTail}`);
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([once(child, "exit"), delay(5000)]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([once(child, "exit"), delay(3000)]);
  }
}

function rawGet(port, pathname, host) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port,
        path: pathname,
        method: "GET",
        headers: host ? { Host: host } : {},
        timeout: 15000,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ status: response.statusCode ?? 0, headers: response.headers, body });
        });
      }
    );
    request.on("timeout", () => request.destroy(new Error("timeout")));
    request.on("error", reject);
    request.end();
  });
}

function cookieFrom(response) {
  const raw = response.headers.get("set-cookie") || "";
  return raw.split(";")[0].trim();
}

async function run() {
  if (!existsSync(BUILD_ID)) {
    throw new Error("Build assente: esegui `npm run build` prima di `npm run check:auth`.");
  }
  if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65000) {
    throw new Error(`AUTH_CHECK_PORT non valida: ${PORT}`);
  }

  console.log(`\nAutenticazione e sicurezza su http://127.0.0.1:${PORT}\n`);
  withPassword = startServer(PORT, PASSWORD);
  await waitForServer(withPassword, PORT);
  const base = `http://127.0.0.1:${PORT}`;

  const loginPage = await fetch(`${base}/login`, { redirect: "manual" });
  record("/login accessibile senza sessione", loginPage.status === 200, `HTTP ${loginPage.status}`);

  const unauthenticated = await fetch(`${base}/api/leads`, { redirect: "manual" });
  record("API protetta senza cookie -> 401", unauthenticated.status === 401, `HTTP ${unauthenticated.status}`);

  const dashboard = await fetch(`${base}/dashboard`, { redirect: "manual" });
  record(
    "dashboard senza cookie -> redirect al login",
    [302, 303, 307, 308].includes(dashboard.status) &&
      (dashboard.headers.get("location") || "").includes("/login"),
    `HTTP ${dashboard.status}, location ${dashboard.headers.get("location") || "assente"}`
  );

  const wrongLogin = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "password-sbagliata" }),
  });
  record("login con password errata -> 401", wrongLogin.status === 401, `HTTP ${wrongLogin.status}`);

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
  });
  const cookie = cookieFrom(login);
  const rawCookie = login.headers.get("set-cookie") || "";
  record("login corretto -> 200", login.status === 200, `HTTP ${login.status}`);
  record("cookie di sessione impostato", cookie.startsWith("lm_session="), cookie ? "cookie presente" : "nessun Set-Cookie");
  record("cookie HttpOnly", /HttpOnly/i.test(rawCookie), rawCookie ? "flag assente" : "nessun cookie");
  record("cookie SameSite=lax", /SameSite=lax/i.test(rawCookie), rawCookie ? "flag assente" : "nessun cookie");
  record("cookie Secure in produzione", /Secure/i.test(rawCookie), rawCookie ? "flag assente" : "nessun cookie");

  if (!cookie) throw new Error("Login riuscito ma senza cookie: impossibile continuare.");

  const authenticated = await fetch(`${base}/api/leads`, {
    headers: { cookie },
    redirect: "manual",
  });
  record("API con sessione -> 200", authenticated.status === 200, `HTTP ${authenticated.status}`);

  const otherApi = await fetch(`${base}/api/v1/leads`, {
    headers: { cookie },
    redirect: "manual",
  });
  record("API v1 senza chiave API -> 401", otherApi.status === 401, `HTTP ${otherApi.status}`);

  const crossOrigin = await fetch(`${base}/api/leads`, {
    method: "POST",
    headers: {
      cookie,
      "content-type": "application/json",
      origin: "https://evil.example",
    },
    body: "{}",
  });
  record("POST cross-origin bloccato -> 403", crossOrigin.status === 403, `HTTP ${crossOrigin.status}`);

  const health = await fetch(`${base}/health`, { headers: { cookie }, redirect: "manual" });
  const healthBody = await health.text();
  record(
    "/health accessibile con sessione e renderizzata",
    health.status === 200 && healthBody.includes("Stato del sistema"),
    `HTTP ${health.status}`
  );

  const securityHeaders = {
    "content-security-policy": "Content-Security-Policy",
    "strict-transport-security": "Strict-Transport-Security",
    "x-frame-options": "X-Frame-Options",
    "x-content-type-options": "X-Content-Type-Options",
    "referrer-policy": "Referrer-Policy",
    "permissions-policy": "Permissions-Policy",
  };
  for (const [header, label] of Object.entries(securityHeaders)) {
    record(`header ${label}`, Boolean(loginPage.headers.get(header)), loginPage.headers.get(header) ? "" : "assente");
  }

  console.log(`\nFail-closed senza APP_PASSWORD su http://127.0.0.1:${NO_PASSWORD_PORT}\n`);
  withoutPassword = startServer(NO_PASSWORD_PORT, "");
  await waitForServer(withoutPassword, NO_PASSWORD_PORT);

  const noPasswordApi = await rawGet(NO_PASSWORD_PORT, "/api/leads");
  record("senza password API protetta -> 503", noPasswordApi.status === 503, `HTTP ${noPasswordApi.status}`);

  const localhostSpoof = await rawGet(NO_PASSWORD_PORT, "/dashboard", "localhost");
  record("senza password /dashboard con Host: localhost -> 503", localhostSpoof.status === 503, `HTTP ${localhostSpoof.status}`);

  const exampleSpoof = await rawGet(NO_PASSWORD_PORT, "/dashboard", "example.com");
  record("senza password /dashboard con Host: example.com -> 503", exampleSpoof.status === 503, `HTTP ${exampleSpoof.status}`);

  const spoofedApi = await rawGet(NO_PASSWORD_PORT, "/api/leads", "localhost");
  record("senza password API con Host: localhost -> 503", spoofedApi.status === 503, `HTTP ${spoofedApi.status}`);

  const publicLogin = await rawGet(NO_PASSWORD_PORT, "/login", "example.com");
  record("senza password /login resta pubblico", publicLogin.status === 200, `HTTP ${publicLogin.status}`);

  const publicHealth = await rawGet(NO_PASSWORD_PORT, "/api/health", "example.com");
  record("senza password /api/health resta pubblico", publicHealth.status === 200, `HTTP ${publicHealth.status}`);
}

try {
  await run();
} catch (error) {
  failures += 1;
  console.error(`\nERRORE: ${error instanceof Error ? error.message : String(error)}\n`);
} finally {
  await stopServer(withoutPassword);
  await stopServer(withPassword);
}

console.log(`\nRisultato: ${passes} controlli superati, ${failures} falliti.\n`);
process.exitCode = failures > 0 ? 1 : 0;
