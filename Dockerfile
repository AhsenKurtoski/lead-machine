# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl sqlite3 \
 && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_BASE_URL=http://localhost:3000
ARG NEXT_PUBLIC_APP_NAME="Lead Machine"
ARG NEXT_PUBLIC_TZ="Europe/Rome"
ENV NEXT_PUBLIC_BASE_URL="$NEXT_PUBLIC_BASE_URL"
ENV NEXT_PUBLIC_APP_NAME="$NEXT_PUBLIC_APP_NAME"
ENV NEXT_PUBLIC_TZ="$NEXT_PUBLIC_TZ"
# The build does not need a real database; the runtime uses /data.
ENV DATABASE_URL="file:/tmp/build.db"

RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL="file:/data/lead-machine.db" \
    NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --create-home nextjs

WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY deploy/entrypoint.sh /usr/local/bin/lead-machine-entrypoint

# Normalize the script line endings (the repo can be checked out on Windows)
# and make the application files writable by the unprivileged user.
RUN sed -i 's/\r$//' /usr/local/bin/lead-machine-entrypoint \
 && chmod +x /usr/local/bin/lead-machine-entrypoint \
 && mkdir -p /data \
 && chown -R nextjs:nodejs /app /data

USER nextjs
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/local/bin/lead-machine-entrypoint"]
