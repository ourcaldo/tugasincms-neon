FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# C-6: Do NOT copy .env.example — inject env vars at runtime

ENV NODE_ENV=production
ENV PORT=5000

RUN npm run build

# C-5: Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 5000

CMD ["npm", "start"]
