# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build && npm prune --omit=dev

# --- Run Stage ---
FROM node:20-alpine AS app

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

EXPOSE 3002

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/main.js"]
