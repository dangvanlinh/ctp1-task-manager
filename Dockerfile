# =============================================================================
# Single-container deploy for ZPS Deploy (zingplay.dev)
# - nginx serves built web static on port 80
# - Node Hono API runs internally on 3000
# - nginx proxies /api/* → Node
# =============================================================================

# ---------- Stage 1: build ----------
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm i -g pnpm@9

# Copy manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages packages
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .

RUN cd apps/api && pnpm prisma generate && pnpm build
RUN pnpm --filter web build


# ---------- Stage 2: runtime ----------
FROM node:20-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm i -g pnpm@9

# API artifacts
COPY --from=builder /app/apps/api/dist               ./api/dist
COPY --from=builder /app/apps/api/prisma             ./api/prisma
COPY --from=builder /app/apps/api/package.json       ./api/package.json
COPY --from=builder /app/node_modules                ./node_modules
COPY --from=builder /app/apps/api/node_modules       ./api/node_modules

# Web static files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# nginx config + entrypoint
COPY deploy/nginx.conf   /etc/nginx/sites-available/default
COPY deploy/start.sh     /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
