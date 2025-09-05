# Smart Dashboard - Multi-stage Docker Build
# Supports both development and production environments

# =============================================================================
# Base Stage - Common dependencies and setup
# =============================================================================
FROM node:18-alpine AS base

# Install system dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# =============================================================================
# Development Stage - Full development environment with hot reload
# =============================================================================
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm ci

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copy source code (will be overridden by volume mount in dev)
COPY --chown=nextjs:nodejs . .

EXPOSE 3000

# Set environment to development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# =============================================================================
# Dependencies Stage - Production dependencies only
# =============================================================================
FROM base AS deps

# Install production dependencies only
ENV NODE_ENV=production
RUN npm ci --only=production --omit=dev && npm cache clean --force

# =============================================================================
# Build Stage - Create optimized production build
# =============================================================================
FROM base AS builder

# Install all dependencies for build process
RUN npm ci

# Copy source code
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# =============================================================================
# Production Stage - Minimal runtime environment
# =============================================================================
FROM node:18-alpine AS production

WORKDIR /app

# Install minimal system dependencies
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy production dependencies from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start production server
CMD ["npm", "start"]