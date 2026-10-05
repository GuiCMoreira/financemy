# syntax=docker/dockerfile:1

# ---------- dependências ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# `postinstall` roda `prisma generate`, que não acessa banco — por isso a
# imagem constrói sem DATABASE_URL.
RUN npm ci

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache postgresql-client tzdata
ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production

# O build standalone traz seu próprio node_modules reduzido.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# A CLI do Prisma e o seed precisam do schema e do tsx em tempo de execução,
# porque o entrypoint aplica o schema antes de servir.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.bin ./node_modules/.bin
COPY --from=build /app/node_modules/tsx ./node_modules/tsx
COPY --from=build /app/node_modules/dotenv ./node_modules/dotenv

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
