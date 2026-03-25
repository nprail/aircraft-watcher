FROM node:20-alpine AS frontend

WORKDIR /app

COPY package*.json ./
COPY vite.config.js tailwind.config.js postcss.config.js ./
RUN npm ci

COPY web ./web
RUN npm run build:web

# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY --from=frontend /app/web/dist ./web/dist

ENV NODE_ENV=production

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "src/index.js"]
