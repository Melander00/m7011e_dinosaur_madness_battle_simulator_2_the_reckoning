
# -- Build Stage --
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json .

RUN npm ci && npm cache clean --force

COPY . .

RUN npm run build && npm prune --production

# -- Deploy Stage --
FROM nginx:1.29.3

COPY --from=builder /app/build /usr/share/nginx/html/