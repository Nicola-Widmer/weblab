# syntax=docker/dockerfile:1
# Build context is the REPO ROOT (see docker-compose.yml) so this can read the
# committed backend/openapi.json for client generation.

# ---- build the Angular bundle ----
FROM node:24-alpine AS build
WORKDIR /app/frontend
RUN corepack enable

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY backend/openapi.json /app/backend/openapi.json
COPY frontend/ ./
RUN pnpm generate:api && pnpm build

# ---- serve with nginx + TLS ----
FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache openssl
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/docker-entrypoint.sh /docker-entrypoint.d/40-generate-cert.sh
RUN chmod +x /docker-entrypoint.d/40-generate-cert.sh
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80 443
