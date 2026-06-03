FROM node:20-alpine

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build args — VITE_ vars must be set at BUILD TIME not runtime
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Build the Vite app (bakes VITE_API_URL into the bundle)
RUN npm run build

# Install serve to serve the built static files
RUN npm install -g serve

EXPOSE 5173

# Serve the built dist folder on port 5173
CMD ["serve", "-s", "dist", "-l", "5173"]