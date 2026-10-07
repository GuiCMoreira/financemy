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

ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production

# O node_modules vem inteiro, e não só o bundle standalone, porque o
# entrypoint aplica o schema e semeia antes de servir — ou seja, precisa da CLI
# do Prisma e do tsx em tempo de execução. Copiar seletivamente quebra: a CLI
# arrasta dezenas de dependências transitivas, e a falta de uma só aparece como
# MODULE_NOT_FOUND no primeiro boot, na máquina de quem clonou o projeto.
#
# O custo é uma imagem maior. Para um projeto que precisa subir de primeira em
# máquina alheia, previsibilidade vale mais que megabytes.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
# O seed importa os casos de uso de `src/` — precisa do fonte e do tsconfig,
# que resolve os caminhos `@/`.
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/package.json ./
COPY --from=build /app/next.config.ts ./

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
