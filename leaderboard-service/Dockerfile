# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build and remove dev dependencies
RUN npm run build && npm prune --production

# --- Run Stage ---
FROM node:22-alpine AS app

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S user -u 1001

COPY --from=builder --chown=user:nodejs /app/package.json /app/package.json
COPY --from=builder --chown=user:nodejs /app/dist /app/dist
COPY --from=builder --chown=user:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=user:nodejs /app/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

USER user

ENTRYPOINT [ "/app/entrypoint.sh" ]