# --- Build Stage ---
FROM node:22-alpine AS builder

# Set workdir to parent level to match tsconfig rootDir
WORKDIR /build

# Copy leaderboard-service to /build/leaderboard-service
COPY leaderboard-service/ ./leaderboard-service/

# Copy shared to /build/shared (same level as leaderboard-service)
COPY shared/ ./shared/

# Install deps from leaderboard-service
WORKDIR /build/leaderboard-service
RUN npm ci && npm cache clean --force

# Build from leaderboard-service directory (tsconfig expects shared at ../shared)
RUN npm run build && npm prune --production

# --- Run Stage ---
FROM node:22-alpine AS app

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S user -u 1001

COPY --from=builder --chown=user:nodejs /build/leaderboard-service/package.json /app/package.json
COPY --from=builder --chown=user:nodejs /build/leaderboard-service/dist /app/dist
COPY --from=builder --chown=user:nodejs /build/leaderboard-service/node_modules /app/node_modules
COPY --from=builder --chown=user:nodejs /build/shared /app/shared
COPY --from=builder --chown=user:nodejs /build/leaderboard-service/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

USER user

ENTRYPOINT [ "/app/entrypoint.sh" ]