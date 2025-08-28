# Use Node.js Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code and built dist folder
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server/server.js"]
