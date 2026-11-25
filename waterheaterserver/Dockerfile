# ---------- Build stage ----------
FROM node:26-slim AS build
WORKDIR /app

# Copy dependency files first for cache efficiency
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY server.ts ./
COPY src ./src

# Build TypeScript
RUN npm run build

# ---------- Production stage ----------
FROM node:26-slim
ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy compiled output from build stage
COPY --from=build --chown=node:node /app/dist ./dist

# Run as non-root user
USER node

# Expose port and start app
EXPOSE 8001
CMD ["node", "dist/server.js"]
