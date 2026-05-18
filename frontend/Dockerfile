FROM node:22-alpine AS builder

WORKDIR /app

# Copy root configs
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend ./frontend

# Build frontend
RUN npm run build --workspace frontend

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone Next.js build
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
# If you have public assets, uncomment the following line
# COPY --from=builder /app/frontend/public ./frontend/public

EXPOSE 3000

# Next.js standalone server generated in monorepo structure
CMD ["node", "frontend/server.js"]
