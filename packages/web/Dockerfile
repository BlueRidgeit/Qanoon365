ARG NODE_BASE_IMAGE=mcr.microsoft.com/devcontainers/javascript-node:dev-22-bookworm
FROM ${NODE_BASE_IMAGE} AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/web/package.json packages/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace=packages/web --workspace=packages/shared --include-workspace-root

# --- Build ---
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY packages/shared/ packages/shared/
COPY packages/web/ packages/web/
COPY package.json package-lock.json tsconfig.base.json ./

WORKDIR /app/packages/web

# Set API URL for production build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node:node /app/packages/web/.next/standalone ./
COPY --from=build --chown=node:node /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=build --chown=node:node /app/packages/web/public ./packages/web/public

USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "packages/web/server.js"]
