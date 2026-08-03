# Deployment guide

Lead Machine is a standard Next.js app. It runs great:

- **Locally** (default) on any laptop — `npm run dev` or `npm run build && npm start`.
- **On a VPS** (Hetzner, DigitalOcean, OVH, Contabo, etc.) behind Caddy / Nginx.
- **On Coolify / CapRover / Dokku** with a Dockerfile.
- **On Fly.io / Render / Railway** with a persistent volume (SQLite needs disk).
- On **Vercel / Netlify / serverless** ⚠️ — read the caveats below; ephemeral storage will erase your DB on cold starts. Use Postgres or attach a real volume.

---

## 1. Before you deploy: checklist

- [ ] You ran `npm run build` locally successfully.
- [ ] You have backed up `prisma/dev.db` (if it has real leads).
- [ ] Your `.env` is filled in: at minimum `DATABASE_URL`, and ideally `NEXT_PUBLIC_BASE_URL=https://<your-domain>`.
- [ ] You have a plan for authentication. The app is single-user / no-login by design; exposing it without auth means **anyone with your URL can read/write every lead, quote and setting**.
- [ ] You understand that SQLite is a **single file** — horizontal scaling with multiple processes (Next.js standalone mode with `NUM_WORKERS > 1`) can cause locking issues. For concurrency >1, switch to Postgres (section 4).

---

## 2. VPS + Caddy (recommended simple setup)

Target OS: **Debian 12 / Ubuntu 24.04 LTS x86_64**. Works on 1 vCPU / 1 GB RAM (the cheapest Hetzner CX11 or DigitalOcean Basic works fine).

### 2.1 One-time server setup

```bash
# as root
apt update && apt upgrade -y
apt install -y curl git ufw

# Node 20 LTS (nodesource, pinned)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # 20.x
npm -v    # 10.x

# Non-root user for the app
adduser --disabled-password --gecos "" lead
usermod -aG sudo lead

# Firewall: SSH + HTTP(S) only
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Caddy 2 (reverse proxy + automatic HTTPS)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### 2.2 Install the app as the `lead` user

```bash
sudo -iu lead

cd /home/lead
git clone https://github.com/lead-machine/lead-machine.git app
cd app

npm install --production=false   # devDependencies needed for prisma generate + build

cp .env.example .env
# edit DATABASE_URL=file:./prod.db  (or keep file:./dev.db — name doesn't matter)
# set NEXT_PUBLIC_BASE_URL=https://your-domain.example.com
# set SMTP_* and GEMINI_API_KEY / GROQ_API_KEY if you need them

# Initialize DB + seed
npx prisma db push
npm run db:seed

# Build
npm run build
```

### 2.3 Run as a systemd service (auto-restart + start on boot)

**As root**, create `/etc/systemd/system/lead-machine.service`:

```ini
[Unit]
Description=Lead Machine Next.js app
After=network.target

[Service]
Type=simple
User=lead
Group=lead
WorkingDirectory=/home/lead/app
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=3
# Optional: sandboxing tweaks
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/home/lead/app /tmp
# Allow 200 MB of RSS (plenty for SQLite + a small Next app); adjust as needed
MemoryMax=512M

[Install]
WantedBy=multi-user.target
```

Then:

```bash
systemctl daemon-reload
systemctl enable --now lead-machine
systemctl status lead-machine     # should be "active (running)"
journalctl -fu lead-machine       # live logs
```

### 2.4 Caddyfile (HTTPS + Basic Auth in front of the app)

**As root**, replace `/etc/caddy/Caddyfile` with:

```caddyfile
# replace this with your real domain (DNS A-record points to your VPS IP)
crm.yourdomain.com {
    # Basic auth: change user and generate the hash with:
    #   caddy hash-password --plaintext 'your-strong-password'
    basicauth * {
        admin $2a$14$EVs9Qk9cBZ...paste-your-hash-here...
    }

    # Drop TRACE, TRACK methods; hide version banners
    header {
        -Server
        X-Content-Type-Options  "nosniff"
        Referrer-Policy         "strict-origin-when-cross-origin"
        X-Frame-Options         "SAMEORIGIN"
        Permissions-Policy      "camera=(), microphone=(), geolocation=(self)"
    }

    reverse_proxy 127.0.0.1:3000 {
        # WebSocket support (for future features)
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    log {
        output file /var/log/caddy/lead-machine.log {
            roll_size 100mb
            roll_keep 7
        }
    }
}
```

Then:

```bash
caddy fmt -w /etc/caddy/Caddyfile      # canonical format
caddy validate --config /etc/caddy/Caddyfile
systemctl restart caddy
```

👉 Visit `https://crm.yourdomain.com`. Caddy will auto-issue the Let's Encrypt cert in ~30 seconds.

---

## 3. Backing up your SQLite DB (critical)

SQLite is **one file** (`prisma/prod.db` or `prisma/dev.db`). Back it up often. A single corrupt DB = all leads gone.

The simple recipe (daily backups, encrypted off-site):

```bash
apt install -y rclone sqlite3
# rclone config → create a remote called "backup" (S3, Backblaze B2, Cloudflare R2, any)
```

Create `/usr/local/sbin/backup-lead-machine.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%F-%H%M)"
SRC="/home/lead/app/prisma/prod.db"
OUTDIR="/var/backups/lead-machine"
mkdir -p "$OUTDIR"

# Safe online backup (doesn't corrupt live writes)
sqlite3 "$SRC" ".backup $OUTDIR/lead-machine-$STAMP.db"
zstd -12 -q -f "$OUTDIR/lead-machine-$STAMP.db"
rm -f "$OUTDIR/lead-machine-$STAMP.db"

# Symlink for "latest"
ln -sf "lead-machine-$STAMP.db.zst" "$OUTDIR/lead-machine-latest.db.zst"

# Off-site
rclone copy --transfers 1 --no-check-certificate \
  "$OUTDIR/lead-machine-$STAMP.db.zst" backup:lead-machine-backups/monthly/

# Retention: keep 14 days local, 6 months remote
find "$OUTDIR" -name 'lead-machine-*' -type f -mtime +14 -delete
```

Then:

```bash
chmod +x /usr/local/sbin/backup-lead-machine.sh
# schedule daily at 03:17 (weird minute to avoid cron storms)
echo '17 3 * * * root /usr/local/sbin/backup-lead-machine.sh >/var/log/lead-backup.log 2>&1' \
  > /etc/cron.d/lead-machine-backup
```

Test it once: `/usr/local/sbin/backup-lead-machine.sh` and verify the `.zst` file appears.

---

## 4. Moving from SQLite → Postgres (optional, for scale)

If you need:
- Multi-process Next.js (`NUM_WORKERS=4`) without write lock contention,
- Failover / replicas,
- Serverless deploy (Vercel + Neon / Supabase / Railway Postgres),

…switch to Postgres.

1. Create a Postgres DB (version 15+). Get a `postgres://user:pass@host:5432/leadmachine?schema=public` URL.
2. In your `.env` (or in the app platform):
   ```
   DATABASE_URL=postgres://user:pass@host:5432/leadmachine?schema=public
   ```
3. Push the schema:
   ```bash
   npx prisma db push
   ```
4. Migrate data from old SQLite → new Postgres. Many ways:
   - Export as CSV via the in-app export endpoints, then re-import via `/api/import/csv` (good enough for most CRM data),
   - Or use `pgloader sqlite:///./prisma/dev.db postgresql:///…` (faster, preserves IDs and dates — read the pgloader docs).
5. `npm run build` → deploy. Prisma takes care of the rest.

---

## 5. Coolify / CapRover / Docker

A minimal `Dockerfile` for the app:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm install --production=false

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma expects the schema at prisma/schema.prisma relative to cwd.
ENV DATABASE_URL=file:./data/prod.db
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl sqlite tini tzdata
ENV TZ=Europe/Rome

# Copy build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Mount persistent volume HERE so the SQLite file survives deploys.
RUN mkdir -p /app/prisma/data
VOLUME ["/app/prisma/data"]

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma db push && exec npm start"]
```

Key points:
- Volume: `/app/prisma/data`. **Never** let your platform rebuild without a persistent volume for this path.
- `prisma db push` on start is idempotent.
- For Coolify set the buildpack to "Dockerfile" and mount the volume in the project settings.

---

## 6. Vercel / Netlify / serverless (⚠️ caveats)

If you really want this on Vercel or similar serverless platforms:

1. **Use Postgres** (Neon, Supabase, Vercel Postgres, Xata, Railway, Render Postgres). SQLite on Vercel FS is **ephemeral** and will be reset on every cold deploy / every function cold start.
2. Point `DATABASE_URL` at that Postgres.
3. Add to `next.config.mjs`:
   ```js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     output: "standalone",
     experimental: { serverActions: { allowedOrigins: ["your-domain.com"] } },
   };
   export default nextConfig;
   ```
4. Add basic auth via Vercel password protection project setting or a middleware.
5. Deploy. First deploy will seed an empty DB — run the settings page once, or run `prisma db push && npm run db:seed` locally pointing to the same remote Postgres URL.

Performance and cold-start latency will be worse than a $4 VPS, but it works.

---

## 7. Healthcheck / uptime monitoring

Add a healthcheck endpoint-free trick: monitor `/` with uptime-kuma / UptimeRobot / BetterStack. The homepage redirects to `/dashboard` but still returns HTTP 200 to the redirect.

If you want an explicit JSON healthcheck, add this one-liner to your `src/app/api/health/route.ts` (it's not in the repo by default to keep surface area low):

```ts
// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ts: Date.now() }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 503 }
    );
  }
}
```

---

## 8. Hardening cheat-sheet

- [ ] Put auth in front (Caddy basicauth, Vercel password, OIDC via Authela, etc.)
- [ ] Set `NEXT_PUBLIC_BASE_URL` to the HTTPS URL.
- [ ] Firewall only allows 22 / 80 / 443.
- [ ] Daily encrypted offsite backups of the DB.
- [ ] Weekly system upgrades (enable `unattended-upgrades` on Debian/Ubuntu).
- [ ] SSH key auth only — disallow `PasswordAuthentication` in `/etc/ssh/sshd_config`.
- [ ] Rotate SMTP / AI API keys every 6 months.
- [ ] Use Dependabot (GitHub → settings → code security) for weekly dependency updates.

---

That's all you need for a 24/7 Lead Machine install. Questions? Open a Discussion in the repo.
