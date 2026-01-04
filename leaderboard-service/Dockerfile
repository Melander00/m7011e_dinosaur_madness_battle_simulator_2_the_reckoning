# ---------- Build stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (with dev deps)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy package.json and install prod deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output
COPY --from=builder /app/dist ./dist

USER app

EXPOSE 3005

CMD ["node", "dist/leaderboard-service/src/main.js"]
