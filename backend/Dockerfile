# syntax=docker/dockerfile:1
# Build context is ./backend (see docker-compose.yml). Multi-stage: full install
# + `nest build`, then a pruned prod image that runs `node dist/main.js` (which
# applies the drizzle/ migrations on start).

# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build && pnpm prune --prod

# ---- runtime ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY package.json ./

# STORAGE_LOCAL_DIR (Compose mounts the `uploads` volume here).
RUN mkdir -p /data/uploads && chown -R node:node /app /data/uploads
USER node

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/openapi.json >/dev/null 2>&1 || exit 1

CMD ["node", "dist/main.js"]
