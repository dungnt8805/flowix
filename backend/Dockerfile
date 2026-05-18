FROM node:22-alpine AS builder

WORKDIR /app

# Copy root configs
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm ci

# Copy backend source
COPY backend ./backend

# Build backend
RUN npm run build --workspace backend

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy compiled files and node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json

EXPOSE 3001

CMD ["node", "backend/dist/main.js"]
