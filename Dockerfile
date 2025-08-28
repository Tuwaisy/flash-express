# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY server/package*.json ./server/

# Install ALL dependencies (including dev dependencies for building)
RUN npm install
RUN cd server && npm install --only=production

# Copy application source
COPY . .

# Build the frontend
RUN npm run build:skip-check

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variable
ENV NODE_ENV=production
ENV PORT=3000

# Start the server
CMD ["node", "server/server.js"]
