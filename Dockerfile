FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Build frontend if present (optional)
RUN if [ -f package.json ] && grep -q "vite" package.json; then npm run build:skip-check || true; fi

EXPOSE 3000

ENV NODE_ENV=production
CMD [ "node", "server/server.js" ]
