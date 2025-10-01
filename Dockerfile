FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy all source files
COPY . .

# Environment variables (with defaults for detection)
ENV NODE_ENV=production
ENV DOCKER_ENV=true

# Supabase
ENV NEXT_PUBLIC_SUPABASE_URL=""
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# Clerk
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
ENV CLERK_SECRET_KEY=""

# Appwrite
ENV NEXT_PUBLIC_APPWRITE_PROJECT_ID=""
ENV NEXT_PUBLIC_APPWRITE_PROJECT_NAME=""
ENV NEXT_PUBLIC_APPWRITE_ENDPOINT=""
ENV NEXT_PUBLIC_BUCKET_NAME=""
ENV NEXT_PUBLIC_BUCKET_ID=""

# Redis
ENV REDIS_HOST=""
ENV REDIS_PORT=""
ENV REDIS_USER=""
ENV REDIS_PASSWORD=""
ENV REDIS_URL=""

# Build the Next.js application
RUN npm run build

# Expose port 5000 for the Next.js app
EXPOSE 5000

# Start the Next.js application
CMD ["npm", "start"]
