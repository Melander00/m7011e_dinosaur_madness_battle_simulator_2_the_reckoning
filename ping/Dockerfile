FROM node:22-alpine

WORKDIR /app

COPY package*.json .

RUN npm ci && npm cache clean --force

COPY . .

RUN npm prune --production

CMD [ "node", "main.js" ]