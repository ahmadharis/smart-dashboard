# Smart Dashboard - Multi-stage Docker Build
# Supports both development and production environments

# =============================================================================
# Base Stage - Common dependencies and setup
# =============================================================================
FROM node:20-alpine AS base

# Install system dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# =============================================================================
# Development Stage - Full development environment with hot reload
# =============================================================================
FROM base AS development

# Create non-root user for security BEFORE installing dependencies
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install all dependencies (including devDependencies) as root first
# Use npm install if no lock file exists, otherwise use npm ci
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install; \
    else npm install; fi

# Copy source code with proper ownership
COPY --chown=nextjs:nodejs . .

# Create necessary directories and ensure proper permissions
RUN mkdir -p .next && \
    chown -R nextjs:nodejs . && \
    chmod -R 755 . && \
    chown -R nextjs:nodejs /app/node_modules

# Switch to non-root user
USER nextjs

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
RUN if [ -f package-lock.json ]; then npm ci --only=production --omit=dev && npm cache clean --force; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --prod && pnpm store prune; \
    else npm install --only=production && npm cache clean --force; fi

# =============================================================================
# Build Stage - Create optimized production build
# =============================================================================
FROM base AS builder

# Install all dependencies for build process
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install; \
    else npm install; fi

# Copy source code
COPY . .

# Set environment for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Set required environment variables for build process
# These are build-time requirements, runtime values can be overridden
ARG NEXT_PUBLIC_SUPABASE_URL=https://mock.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key-for-build-that-is-over-one-hundred-characters-long-to-satisfy-validation-requirements-in-github-actions
ARG SUPABASE_URL=https://mock.supabase.co
ARG SUPABASE_SERVICE_ROLE_KEY=mock-service-key-for-build-that-is-over-one-hundred-characters-long-to-satisfy-validation-requirements-in-github-actions
ARG SUPABASE_ANON_KEY=mock-anon-key-for-build-that-is-over-one-hundred-characters-long-to-satisfy-validation-requirements-in-github-actions

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Build the application
RUN npm run build

# =============================================================================
# Production Stage - Minimal runtime environment
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install minimal system dependencies
RUN apk add --no-cache dumb-init wget

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
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start production server
CMD ["npm", "start"]