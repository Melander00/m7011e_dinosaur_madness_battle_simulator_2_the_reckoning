# --- Build Stage ---
FROM node:22-alpine AS builder

# Set workdir to parent level to match tsconfig rootDir
WORKDIR /build

# Copy friend-service to /build/friend-service
COPY friend-service/ ./friend-service/

# Copy shared to /build/shared (same level as friend-service)
COPY shared/ ./shared/

# Install deps from friend-service
WORKDIR /build/friend-service
RUN npm ci && npm cache clean --force

# Build from friend-service directory (tsconfig expects shared at ../shared)
RUN npm run build && npm prune --production

# --- Run Stage ---
FROM node:22-alpine AS app

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S user -u 1001

COPY --from=builder --chown=user:nodejs /build/friend-service/package.json /app/package.json
COPY --from=builder --chown=user:nodejs /build/friend-service/dist /app/dist
COPY --from=builder --chown=user:nodejs /build/friend-service/node_modules /app/node_modules
COPY --from=builder --chown=user:nodejs /build/shared /app/shared

USER user

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/server.js"]
