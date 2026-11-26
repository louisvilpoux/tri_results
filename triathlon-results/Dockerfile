# Image du front Next.js, construite par Coolify (contexte : dossier triathlon-results/).
# Voir deploiement.md. Sortie « standalone » de Next (next.config.ts) : serveur Node minimal
# sans node_modules complet.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variables lues au build : NEXT_PUBLIC_* sont écrites dans le JavaScript envoyé au navigateur,
# SITE_URL dans les pages préparées au build. Dans Coolify, cocher « Build Variable » pour elles.
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
