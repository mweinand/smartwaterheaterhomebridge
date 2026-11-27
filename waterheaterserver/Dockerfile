# ---------- Build stage ----------
FROM node:26-slim AS build
WORKDIR /app

# Copy dependency files first for cache efficiency
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY admin/package.json admin/package-lock.json ./admin/
RUN --mount=type=cache,target=/root/.npm npm ci --prefix admin

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY server.ts ./
COPY src ./src
COPY admin ./admin

# Build TypeScript
RUN npm run build
RUN npm run build:admin

# ---------- Production stage ----------
FROM node:26-slim
ENV NODE_ENV=production
WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy compiled output from build stage
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/admin/dist ./admin/dist
RUN mkdir -p /app/logs && chown node:node /app/logs

# Run as non-root user
USER node

# Expose port and start app
EXPOSE 8001
CMD ["node", "dist/server.js"]
