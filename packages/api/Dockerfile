ARG NODE_BASE_IMAGE=mcr.microsoft.com/devcontainers/javascript-node:dev-22-bookworm
FROM ${NODE_BASE_IMAGE} AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api/package.json packages/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace=packages/api --workspace=packages/shared --include-workspace-root

# --- Build ---
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY packages/shared/ packages/shared/
COPY packages/api/ packages/api/
COPY package.json package-lock.json tsconfig.base.json ./

# Build shared first
WORKDIR /app/packages/shared
RUN npx tsc

# Generate Prisma client
WORKDIR /app/packages/api
RUN npx prisma generate

# Build NestJS
RUN npx nest build

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built output and dependencies
COPY --from=build --chown=node:node /app/packages/api/dist ./dist
COPY --from=build --chown=node:node /app/packages/api/prisma ./prisma
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/api/package.json ./
# Copy shared dist for runtime imports
COPY --from=build --chown=node:node /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /app/packages/shared/package.json ./packages/shared/package.json

USER node

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
