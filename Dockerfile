# =============================================================================
# Single-container deploy for ZPS Deploy (zingplay.dev)
# - nginx serves built web static on :80
# - Node Hono API runs internally on :3000
# - nginx proxies /api/* → Node
# =============================================================================

# ---------- Stage 1: build ----------
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm i -g pnpm@9

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages packages
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY . .

RUN cd apps/api && pnpm prisma generate && pnpm build
RUN pnpm --filter web build


# ---------- Stage 2: runtime ----------
FROM node:20-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx openssl ca-certificates bash curl gnupg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/pgdg.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/pgdg.gpg] https://apt.postgresql.org/pub/repos/apt/ bookworm-pgdg main" \
         > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends \
       postgresql-client-17 \
    && rm -rf /var/lib/apt/lists/* \
    && npm i -g pnpm@9 prisma@6.19.3

# Copy entire pnpm workspace structure (symlinks need the full tree to resolve)
COPY --from=builder /app/node_modules    ./node_modules
COPY --from=builder /app/packages        ./packages
COPY --from=builder /app/apps/api/dist   ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/web/dist   ./apps/web/dist
COPY --from=builder /app/package.json    ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml  ./pnpm-lock.yaml
COPY --from=builder /app/.npmrc          ./.npmrc

# Web static → nginx
RUN mkdir -p /usr/share/nginx/html && cp -r apps/web/dist/. /usr/share/nginx/html/

# nginx config + entrypoint
COPY deploy/nginx.conf /etc/nginx/sites-available/default
COPY deploy/start.sh   /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["bash", "/start.sh"]
