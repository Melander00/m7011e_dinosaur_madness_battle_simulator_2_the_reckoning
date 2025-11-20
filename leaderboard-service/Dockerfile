# --- Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json .

RUN npm ci && npm cache clean --force

COPY . .

RUN npm run prisma:gen && npm run build && npm prune --production

# --- Run Stage ---
FROM node:22-alpine AS app

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S user -u 1001

COPY --from=builder --chown=user:nodejs /app/package.json /app/package.json
COPY --from=builder --chown=user:nodejs /app/dist /app/dist
COPY --from=builder --chown=user:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=user:nodejs /app/prisma /app/prisma
COPY --from=builder --chown=user:nodejs /app/entrypoint.sh /app/entrypoint.sh
COPY --from=builder --chown=user:nodejs /app/src/generated/prisma/lib* /app/dist/generated/prisma/

RUN chmod +x /app/entrypoint.sh

USER user

ENTRYPOINT [ "/app/entrypoint.sh" ]
# CMD [ "npm", "run", "start" ]