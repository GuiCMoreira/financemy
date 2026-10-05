#!/bin/sh
set -e

# Espera o Postgres aceitar conexões. O healthcheck do compose cobre o caso
# normal, mas um banco externo (Supabase, Neon) não tem healthcheck nenhum —
# e falhar aqui com mensagem clara é melhor que o app subir e dar 500.
echo "aguardando o banco..."
tentativas=0
until node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect().then(() => c.end()).catch(() => process.exit(1));
" 2>/dev/null; do
  tentativas=$((tentativas + 1))
  if [ "$tentativas" -ge 30 ]; then
    echo "banco inacessível após 30 tentativas. Confira DATABASE_URL." >&2
    exit 1
  fi
  sleep 2
done
echo "banco acessível."

echo "aplicando o schema..."
./node_modules/.bin/prisma db push --skip-generate

# Semeia apenas quando vazio: rodar o seed num banco com dados reais seria
# destrutivo, e o seed é idempotente justamente para esta chamada ser segura.
if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "verificando dados de demonstração..."
  ./node_modules/.bin/tsx prisma/seed.ts
fi

echo "iniciando o Caixa em http://localhost:3000"
exec node server.js
