# Build context: the monorepo root (demo-claudecode/).
#   docker build -f apps/backend/Dockerfile -t invoices-backend .
# Runs `next start` on :4000. SQLite lives in /data (mount a volume). Apply migrations as a release step:
#   docker run --rm -v invoices-data:/data -e DATABASE_URL=file:/data/prod.db invoices-backend npx prisma migrate deploy

FROM node:22-bookworm-slim AS prune
WORKDIR /repo
RUN npm install --global turbo@^2
COPY . .
RUN turbo prune @invoices/backend --docker

FROM node:22-bookworm-slim AS build
WORKDIR /repo
# better-sqlite3 ships prebuilt binaries; the toolchain is the fallback when none matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY --from=prune /repo/out/json/ .
COPY --from=prune /repo/out/package-lock.json ./package-lock.json
# Scripts are off here: the `postinstall` (prisma generate) needs the schema, which only arrives with the full tree.
RUN npm ci --ignore-scripts
COPY --from=prune /repo/out/full/ .
# `turbo prune` leaves out the root tsconfig that every package extends.
COPY tsconfig.base.json ./
# Install scripts were skipped above: run the ones that matter (native sqlite binding, Prisma's schema engine).
RUN npm rebuild better-sqlite3 @prisma/engines && npm run db:generate --workspace=@invoices/backend
RUN npx turbo run build --filter=@invoices/backend
RUN npm prune --omit=dev --ignore-scripts

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production DATABASE_URL=file:/data/prod.db
# Prisma's schema engine (migrate deploy) needs OpenSSL, which the slim image lacks.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY --from=build /repo /repo
RUN mkdir /data && chown node:node /data
USER node
WORKDIR /repo/apps/backend
EXPOSE 4000
VOLUME /data
CMD ["npm", "start"]
