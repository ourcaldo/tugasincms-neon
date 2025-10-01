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

# Environment variables (with defaults for detection)
ENV NODE_ENV=production
ENV DOCKER_ENV=true
ENV BACKEND_PORT=3001

# Supabase
ENV NEXT_PUBLIC_SUPABASE_URL=""
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# Clerk
ENV CLERK_PUBLISHABLE_KEY=""
ENV CLERK_SECRET_KEY=""
ENV VITE_CLERK_PUBLISHABLE_KEY=""

# Appwrite
ENV VITE_APPWRITE_PROJECT_ID=""
ENV VITE_APPWRITE_PROJECT_NAME=""
ENV VITE_APPWRITE_ENDPOINT=""
ENV VITE_BUCKET_NAME=""
ENV VITE_BUCKET_ID=""

# Redis
ENV REDIS_HOST=""
ENV REDIS_PORT=6379
ENV REDIS_USER=""
ENV REDIS_PASSWORD=""
ENV REDIS_URL=""

# Expose ports for frontend and backend
EXPOSE 5000 3001

# Start both backend and frontend
CMD sh -c "npm run backend & npm run start"
