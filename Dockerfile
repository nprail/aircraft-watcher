FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production

# Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
