FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci && npm cache clean --force

# Copy all source files
COPY . .

# Build the frontend
RUN npm run build

# Expose ports for frontend and backend
EXPOSE 5000 3001

# Start both backend and frontend
CMD sh -c "npm run backend & npm run start"
