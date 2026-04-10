# 1. Base image for all build stages
FROM node:20-alpine AS base
WORKDIR /app
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-maxtimeout 120000

# 2. Build Potree Core (Gulp)
FROM base AS potree-core-builder
COPY public/potree/potree/package*.json ./
RUN npm install --ignore-scripts
COPY public/potree/potree/ .
# Fix for symlinked libs: copy the actual content
COPY public/potree/public/libs ./libs
RUN npx gulp build pack

# 3. Build Potree Vite Wrapper
FROM base AS potree-vite-builder
COPY public/potree/package*.json ./
RUN npm install --ignore-scripts
COPY public/potree/ .
# Inject the built potree core files
COPY --from=potree-core-builder /app/build ./potree/build
COPY --from=potree-core-builder /app/libs ./potree/libs
RUN npm run build

# 4. Main App Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm install

# 5. Main App Build Stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Copy the final compiled Potree viewer into the public folder
COPY --from=potree-vite-builder /app/dist ./public/potree/dist
RUN npm run build

# 6. Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
