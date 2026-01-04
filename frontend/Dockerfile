# ---------- Build stage ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (deterministic)
COPY package.json package-lock.json ./
RUN npm ci

# Build frontend
COPY . .
RUN npm run build


# ---------- Runtime stage ----------
FROM nginx:alpine

# SPA routing support for React Router
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '}' \
  > /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 80

