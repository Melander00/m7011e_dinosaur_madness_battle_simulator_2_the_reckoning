
# -- Build Stage --
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./

RUN npm install && npm cache clean --force

COPY . .

RUN npm run build

# -- Deploy Stage --
FROM nginx:1.29.3

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

COPY --from=builder /app/dist/ /usr/share/nginx/html/
