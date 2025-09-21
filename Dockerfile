# Use Node.js Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for root project
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm install

# Copy server package files
COPY server/package*.json ./server/

# Install server dependencies
WORKDIR /app/server
RUN npm install --only=production

# Go back to app root
WORKDIR /app

# Copy source code and build files
COPY src/ ./src/
COPY public/ ./public/
COPY server/ ./server/
COPY index.html ./
COPY app.html ./
COPY privacy-policy.html ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build the project
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port (Railway uses dynamic PORT)
EXPOSE ${PORT:-8080}

# Start the application
CMD ["node", "server/server.js"]
