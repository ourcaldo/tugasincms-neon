FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN cp .env.example .env

ENV NODE_ENV=production
ENV PORT=5000

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
