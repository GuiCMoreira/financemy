#!/bin/sh
set -e

# Espera o banco aceitar conexões. O healthcheck do compose cobre o caso
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
npx prisma db push

# Semeia apenas quando SEED_DEMO está ligado. O seed é idempotente — se já
# houver dados, não faz nada —, então esta chamada é segura mesmo em reinício.
if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "carregando dados de demonstração..."
  npx tsx prisma/seed.ts
fi

echo "Caixa disponível em http://localhost:3000"
exec npx next start
