# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholder env vars (real values injected at runtime)
ENV NEXTAUTH_SECRET=build-placeholder
ENV NEXTAUTH_URL=http://localhost:3000
ENV DATABASE_URL=mysql://root:secret@localhost:3306/superset_meta
ENV REDIS_URL=redis://localhost:6379
ENV ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000

RUN npm run build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Next.js standalone bundle
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

# Drizzle migration files + config (applied at startup)
COPY --from=builder --chown=nextjs:nodejs /app/drizzle          ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts

# Need node_modules for drizzle-kit at runtime
COPY --from=deps --chown=nextjs:nodejs /app/node_modules        ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/package.json        ./package.json

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["docker-entrypoint.sh"]
