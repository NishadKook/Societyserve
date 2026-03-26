FROM node:20-alpine AS base
RUN apk add --no-cache openssl

# ── Install dependencies ──────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy root workspace config
COPY package.json yarn.lock* .yarnrc.yml* ./
COPY .yarn ./.yarn 2>/dev/null || true

# Copy backend package.json
COPY apps/backend/package.json ./apps/backend/

# Install only backend dependencies (no workspaces hoisting issues)
WORKDIR /app/apps/backend
RUN npm install --legacy-peer-deps

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app/apps/backend

COPY --from=deps /app/apps/backend/node_modules ./node_modules
COPY apps/backend .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app/apps/backend

ENV NODE_ENV=production
ENV ENVIRONMENT=production

# Copy built app + prisma
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/node_modules ./node_modules
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/apps/backend/package.json ./

EXPOSE 4000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
