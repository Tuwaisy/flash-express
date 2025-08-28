# Use Node.js Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the pre-built dist folder and server code
COPY dist/ ./dist/
COPY server/ ./server/
COPY public/ ./public/

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server/server.js"]
