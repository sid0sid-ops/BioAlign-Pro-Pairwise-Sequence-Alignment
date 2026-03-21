# Build Stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Only copy package info first to cache dependency installation layer
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Run Scientific Validation Tests
RUN npm run test

# Bundle CSS and JS into /dist and /css
RUN npm run build

# Serve Stage
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the entire research environment into the webroot,
# which includes /dist bundles for speed, and /core /algorithms 
# modules for Web Worker multi-threading and transparent Open Science reading.
COPY --from=builder /usr/src/app /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
