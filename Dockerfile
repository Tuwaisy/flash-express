# Use Node.js Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for root project
COPY package*.json ./

# Install root dependencies
RUN npm install --only=production

# Copy server package files
COPY server/package*.json ./server/

# Install server dependencies
WORKDIR /app/server
RUN npm install --only=production

# Go back to app root
WORKDIR /app

# Copy the pre-built dist folder and server code
COPY dist/ ./dist/
COPY server/ ./server/
COPY public/ ./public/

# Expose port (Railway uses dynamic PORT)
EXPOSE ${PORT:-8080}

# Start the application
CMD ["node", "server/server.js"]
