FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- Desarrollo ---
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- Builder ---
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

# --- Producción ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
