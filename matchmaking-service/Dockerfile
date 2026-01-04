# ==========================================
# Stage 1: Build
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared module first (dependency)
COPY shared/package*.json ./shared/
WORKDIR /app/shared
RUN npm ci

COPY shared/ ./
RUN npm run build

# Copy matchmaking-service
WORKDIR /app/matchmaking-service
COPY matchmaking-service/package*.json ./
RUN npm ci

COPY matchmaking-service/ ./
RUN npm run build

# ==========================================
# Stage 2: Production
# ==========================================
FROM node:20-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy shared module - place compiled files where relative imports expect them
# The import is "../../shared/db/index" so from /app/matchmaking-service/dist/
# it needs to find /app/shared/db/index.js
COPY --from=builder /app/shared/package*.json ./shared/
WORKDIR /app/shared
RUN npm ci --only=production --ignore-scripts

# Copy compiled shared files to /app/shared/db/ (not /app/shared/dist/db/)
COPY --from=builder /app/shared/dist/db ./db

# Copy matchmaking-service (compiled)
WORKDIR /app/matchmaking-service
COPY --from=builder /app/matchmaking-service/package*.json ./
RUN npm ci --only=production --ignore-scripts

COPY --from=builder /app/matchmaking-service/dist ./dist

# Set ownership to non-root user
RUN chown -R nodejs:nodejs /app

USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3004

EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3004/healthz || exit 1

# Run from matchmaking-service directory so relative paths work
WORKDIR /app/matchmaking-service
CMD ["node", "dist/server.js"]
