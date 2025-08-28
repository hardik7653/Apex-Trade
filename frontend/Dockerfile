# Stage 1: Build the React app
FROM node:18-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files and install all dependencies (including dev dependencies)
COPY package*.json ./
RUN npm install

# Copy the rest of the source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the built app using 'serve'
FROM node:18-alpine AS production

# Install a simple HTTP server for serving static files
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy built files from the previous stage
COPY --from=builder /app/build /app/build

# Expose port 3000 (or use Railway’s $PORT variable)
EXPOSE 3000

# Command to run the static server
CMD ["serve", "-s", "build", "-l", "0.0.0.0:3000"]

