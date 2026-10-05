import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * A datasource só é declarada quando há URL no ambiente: `prisma generate`
 * apenas lê o schema e gera código, mas o helper `env()` lança se a variável
 * faltar — e isso derruba o `postinstall` em plataformas de deploy, onde
 * instalar dependências não deveria exigir credencial de banco.
 *
 * `DIRECT_URL` tem prioridade porque a CLI executa DDL, que precisa de conexão
 * direta; um pooler em transaction mode pode interromper a migração no meio.
 */
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  ...(url ? { datasource: { url } } : {}),
})
