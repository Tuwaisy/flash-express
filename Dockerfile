# Use Node.js Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build:skip-check

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server/server.js"]
