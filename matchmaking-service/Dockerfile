# --- Build Stage ---
FROM node:22-alpine AS builder

# Set workdir to parent level to match tsconfig rootDir
WORKDIR /build

# Copy matchmaking-service to /build/matchmaking-service
COPY matchmaking-service/ ./matchmaking-service/

# Copy shared to /build/shared (same level as matchmaking-service)
COPY shared/ ./shared/

# Install deps from matchmaking-service
WORKDIR /build/matchmaking-service
RUN npm ci && npm cache clean --force

# Build from matchmaking-service directory (tsconfig expects shared at ../shared)
RUN npm run build && npm prune --production

# --- Run Stage ---
FROM node:22-alpine AS app

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S user -u 1001

COPY --from=builder --chown=user:nodejs /build/matchmaking-service/package.json /app/package.json
COPY --from=builder --chown=user:nodejs /build/matchmaking-service/dist /app/dist
COPY --from=builder --chown=user:nodejs /build/matchmaking-service/node_modules /app/node_modules
COPY --from=builder --chown=user:nodejs /build/shared /app/shared

USER user

ENV NODE_ENV=production
ENV PORT=3004

EXPOSE 3004

CMD ["node", "dist/server.js"]
