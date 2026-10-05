# Caixa — Implementation Plan (Fases 1 a 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar um controle financeiro feito sob medida em produto genérico, self-hosted e open-source, com categorias, contas com saldo, lançamentos avulsos e relatórios.

**Architecture:** Camada `domain/` pura (sem Prisma, sem React) migrada do projeto anterior e ampliada; `server/` traduz Prisma para o domínio; `app/` são as telas Next.js. Uma única tabela `Lancamento` substitui as quatro que representavam a mesma coisa, com parcelamento e recorrência atuando como geradores.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Prisma 7.10, Postgres, Vitest 5, Zod 4, Tailwind 4.

**Specs:**
- `docs/superpowers/specs/2026-10-05-fase-1-nucleo-generico-design.md`
- `docs/superpowers/specs/2026-10-05-fase-2-relatorios-design.md`
- `docs/superpowers/specs/2026-10-05-fase-3-produto-publico-design.md`

## Global Constraints

- **Prisma fixado em 7.10.0** em `prisma` e `@prisma/client`, mesma versão exata. A tag `latest` aponta para `8.0.0-rc.20`, um release candidate; a última estável é a 7.10.0 (tag `prev`).
- **TypeScript 5.9**, não 7.x — a major 7 é recente e nem Next 16 nem Prisma 7 a declaram suportada.
- **Dinheiro é sempre inteiro em centavos**, no domínio e no banco (`Int`). Conversão só na borda de entrada.
- **Datas são strings `YYYY-MM-DD`**, nunca `Date`. A Vercel roda em UTC e a máquina local em `America/Sao_Paulo`; `new Date('2026-08-15')` lido em São Paulo vira dia 14.
- **`domain/` não importa Prisma, React nem Next.** Se um teste de domínio precisar de banco ou browser, a regra está na camada errada.
- **`prisma.config.ts` só declara `datasource` quando há URL no ambiente** — `prisma generate` não acessa banco e não pode quebrar o `postinstall`.
- **Nada de transação interativa** (`$transaction(async tx => ...)`): incompatível com pooler em transaction mode. Usar `create` aninhado ou operações sequenciais.
- **Valor é sempre positivo; a direção vem de `tipo`** (`ENTRADA`/`SAIDA`).
- **`status` nunca é inferido da data.** Um lançamento vencido não é um lançamento pago.
- **Nenhum dado pessoal real** em código, seed, README ou histórico.
- **Commits:** `MODULO | TIPO | DESCRICAO`, sem `Co-Authored-By`.

## Review Focus

Classes de entrada que as specs implicam mas nenhum teste óbvio exercita, em ordem de probabilidade de machucar alguém:

1. **Dia do mês inexistente** — recorrência no dia 31 em fevereiro. Esperado: cair no último dia do mês, nunca pular a ocorrência. (Task 5)
2. **Parcela com valor que não divide exato** — R$ 100 em 3×. Esperado: a soma das parcelas igualar o total, com a diferença de centavos numa parcela só. (Task 4)
3. **Transferência entre a mesma conta** — origem igual a destino. Esperado: recusar no cadastro, não criar par de lançamentos que se anulam. (Task 7)
4. **Período invertido no relatório** — `?de=2026-12&ate=2026-01`. Esperado: tratar como intervalo vazio ou inverter, nunca somar errado em silêncio. (Task 12)
5. **Categoria excluída com lançamentos** — esperado: desativar em vez de apagar, preservando o histórico dos relatórios. (Task 11)

---

# FASE 1 — Núcleo genérico

### Task 1: Esqueleto do projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`, `prisma.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`
- Test: já existem os 5 arquivos de teste migrados em `src/domain/`

**Interfaces:**
- Consumes: domínio migrado (`dinheiro`, `fatura`, `parcelamento`, `fluxo`, `pessoas`, `antecipacao`)
- Produces: `npm test`, `npm run dev`, `npm run build`, `npm run db:up`, `npm run db:seed`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "caixa",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/adapter-pg": "7.10.0",
    "@prisma/client": "7.10.0",
    "dotenv": "^17.4.2",
    "next": "16.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "zod": "^4.6.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.3",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "postcss": "^8.5.28",
    "prisma": "7.10.0",
    "tailwindcss": "^4.3.3",
    "tsx": "^4.23.13",
    "typescript": "^5.9.0",
    "vitest": "^5.0.3"
  }
}
```

- [ ] **Step 2: Criar `prisma.config.ts`**

```ts
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * A datasource só é declarada quando há URL no ambiente: `prisma generate`
 * apenas lê o schema e gera código, mas o helper `env()` lança se a variável
 * faltar — e isso derruba o `postinstall` em plataformas de deploy.
 *
 * `DIRECT_URL` tem prioridade porque a CLI executa DDL, que precisa de conexão
 * direta; um pooler em transaction mode interrompe migração no meio.
 */
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  ...(url ? { datasource: { url } } : {}),
})
```

- [ ] **Step 3: Criar `.env.example` e `.gitignore`**

```
# .env.example
DATABASE_URL="postgresql://caixa:caixa@localhost:5434/caixa?schema=public"
# DIRECT_URL="..."  # só em produção com pooler
```

```
# .gitignore
node_modules/
.next/
.env
.env*.local
next-env.d.ts
tsconfig.tsbuildinfo
docs/capturas/*.tmp.png
```

- [ ] **Step 4: Instalar e verificar que o domínio migrado passa**

Run: `npm install && npm test`
Expected: PASS — 33 testes dos 5 arquivos migrados.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "SETUP | CHORE | esqueleto do projeto com dominio migrado"
```

---

### Task 2: Schema unificado

**Files:**
- Create: `prisma/schema.prisma`, `src/server/db.ts`, `docker-compose.yml`

**Interfaces:**
- Produces: modelos `Conta`, `Categoria`, `Pessoa`, `Lancamento`, `Parcelamento`, `Recorrencia`, `Transferencia`, `Antecipacao`; client em `src/server/db.ts`

- [ ] **Step 1: Escrever o schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum TipoConta {
  CORRENTE
  POUPANCA
  DINHEIRO
  CARTAO
  INVESTIMENTO
}

enum TipoMovimento {
  ENTRADA
  SAIDA
}

enum StatusLancamento {
  PREVISTO
  EFETIVADO
  ATRASADO
}

model Conta {
  id            String    @id @default(cuid())
  nome          String
  tipo          TipoConta
  saldoInicial  Int       @default(0) // centavos
  diaFechamento Int? // só cartão
  diaVencimento Int? // só cartão
  limite        Int? // só cartão, centavos
  ativa         Boolean   @default(true)
  criadaEm      DateTime  @default(now())

  lancamentos       Lancamento[]
  parcelamentos     Parcelamento[]
  recorrencias      Recorrencia[]
  antecipacoes      Antecipacao[]
  transferSaida     Transferencia[] @relation("origem")
  transferEntrada   Transferencia[] @relation("destino")
}

model Categoria {
  id             String        @id @default(cuid())
  nome           String
  tipo           TipoMovimento
  cor            String        @default("#8A19D6")
  categoriaPai   Categoria?    @relation("hierarquia", fields: [categoriaPaiId], references: [id])
  categoriaPaiId String?
  filhas         Categoria[]   @relation("hierarquia")
  ativa          Boolean       @default(true)

  lancamentos   Lancamento[]
  parcelamentos Parcelamento[]
  recorrencias  Recorrencia[]

  @@index([tipo, ativa])
}

model Pessoa {
  id       String   @id @default(cuid())
  nome     String
  ehDono   Boolean  @default(false)
  ativa    Boolean  @default(true)
  criadaEm DateTime @default(now())

  lancamentos   Lancamento[]
  parcelamentos Parcelamento[]
  pagamentos    Pagamento[]
}

/// A unidade central. Tudo que entra ou sai é um Lancamento; parcelamento e
/// recorrência são geradores, não tipos.
model Lancamento {
  id          String           @id @default(cuid())
  descricao   String
  valor       Int // centavos, sempre positivo
  tipo        TipoMovimento
  data        String // YYYY-MM-DD
  competencia String // YYYY-MM
  status      StatusLancamento @default(PREVISTO)

  conta   Conta  @relation(fields: [contaId], references: [id])
  contaId String

  categoria   Categoria? @relation(fields: [categoriaId], references: [id])
  categoriaId String?

  pessoa   Pessoa? @relation(fields: [pessoaId], references: [id])
  pessoaId String?

  parcelamento   Parcelamento? @relation(fields: [parcelamentoId], references: [id], onDelete: Cascade)
  parcelamentoId String?
  numeroParcela  Int?
  totalParcelas  Int?

  recorrencia   Recorrencia? @relation(fields: [recorrenciaId], references: [id], onDelete: Cascade)
  recorrenciaId String?

  transferencia   Transferencia? @relation(fields: [transferenciaId], references: [id], onDelete: Cascade)
  transferenciaId String?

  criadoEm DateTime @default(now())

  @@index([competencia, contaId])
  @@index([categoriaId])
  @@index([pessoaId])
  @@index([status])
}

model Parcelamento {
  id             String @id @default(cuid())
  descricao      String
  valorParcela   Int
  numeroParcelas Int
  dataInicio     String

  conta       Conta      @relation(fields: [contaId], references: [id])
  contaId     String
  categoria   Categoria? @relation(fields: [categoriaId], references: [id])
  categoriaId String?
  pessoa      Pessoa?    @relation(fields: [pessoaId], references: [id])
  pessoaId    String?

  lancamentos Lancamento[]
  antecipacao Antecipacao?
  criadoEm    DateTime     @default(now())
}

model Recorrencia {
  id         String        @id @default(cuid())
  descricao  String
  valor      Int
  tipo       TipoMovimento
  diaDoMes   Int
  dataInicio String
  dataFim    String?
  ativa      Boolean       @default(true)

  conta       Conta      @relation(fields: [contaId], references: [id])
  contaId     String
  categoria   Categoria? @relation(fields: [categoriaId], references: [id])
  categoriaId String?

  lancamentos Lancamento[]
}

model Transferencia {
  id      String @id @default(cuid())
  data    String
  valor   Int

  contaOrigem    Conta  @relation("origem", fields: [contaOrigemId], references: [id])
  contaOrigemId  String
  contaDestino   Conta  @relation("destino", fields: [contaDestinoId], references: [id])
  contaDestinoId String

  lancamentos Lancamento[]
  criadaEm    DateTime     @default(now())
}

model Antecipacao {
  id            String @id @default(cuid())
  data          String
  valorBruto    Int // o que foi contratado
  valorLiquido  Int // o que foi recebido

  conta   Conta  @relation(fields: [contaId], references: [id])
  contaId String

  parcelamento   Parcelamento? @relation(fields: [parcelamentoId], references: [id])
  parcelamentoId String?       @unique

  criadaEm DateTime @default(now())
}

model Pagamento {
  id       String   @id @default(cuid())
  pessoa   Pessoa   @relation(fields: [pessoaId], references: [id])
  pessoaId String
  valor    Int
  data     String
  criadoEm DateTime @default(now())

  @@index([pessoaId])
}
```

Datas como `String` e não `DateTime` pelo mesmo motivo da constraint global: `DateTime` do Postgres carrega fuso, e uma parcela do dia 15 lida em outro fuso vira dia 14.

- [ ] **Step 2: Criar `docker-compose.yml`** (porta 5434 para não conflitar com outros projetos)

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: caixa-postgres
    environment:
      POSTGRES_USER: caixa
      POSTGRES_PASSWORD: caixa
      POSTGRES_DB: caixa
    ports:
      - "5434:5432"
    volumes:
      - caixa-pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U caixa"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

volumes:
  caixa-pgdata:
```

- [ ] **Step 3: Criar o client**

```ts
// src/server/db.ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function criarClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('variável de ambiente obrigatória ausente: DATABASE_URL')
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const prisma = globalForPrisma.prisma ?? criarClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Aplicar e verificar**

Run: `npm run db:up && npm run db:push && npx prisma generate`
Expected: "in sync"; 9 tabelas criadas.

Run: `docker exec caixa-postgres psql -U caixa -d caixa -c "\dt"`

- [ ] **Step 5: Commit**

```bash
git add prisma/ src/server/db.ts docker-compose.yml
git commit -m "DB | FEAT | schema unificado com lancamento como unidade central"
```

---

### Task 3: Domínio — categorias e agregação

**Files:**
- Create: `src/domain/categorias.ts`
- Test: `src/domain/categorias.test.ts`

**Interfaces:**
- Consumes: `Centavos` de `domain/dinheiro`
- Produces:
  - `type LancamentoAgregavel = { categoriaId: string | null; categoriaNome: string; valor: Centavos; tipo: 'ENTRADA' | 'SAIDA'; ehTransferencia: boolean; pessoaId: string | null }`
  - `type FatiaCategoria = { nome: string; valor: Centavos; percentual: number }`
  - `function gastosPorCategoria(lancamentos: LancamentoAgregavel[], opcoes?: { donoId?: string; apenasDoDono?: boolean; maximoFatias?: number }): FatiaCategoria[]`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/domain/categorias.test.ts
import { describe, it, expect } from 'vitest'
import { gastosPorCategoria } from './categorias'

const base = { tipo: 'SAIDA' as const, ehTransferencia: false, pessoaId: null }

describe('gastosPorCategoria', () => {
  it('agrupa e calcula percentual', () => {
    const r = gastosPorCategoria([
      { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 30000 },
      { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 20000 },
      { ...base, categoriaId: 'b', categoriaNome: 'Transporte', valor: 50000 },
    ])
    expect(r).toEqual([
      { nome: 'Mercado', valor: 50000, percentual: 50 },
      { nome: 'Transporte', valor: 50000, percentual: 50 },
    ])
  })

  it('ignora transferências entre contas próprias', () => {
    const r = gastosPorCategoria([
      { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 10000 },
      { ...base, categoriaId: null, categoriaNome: 'Transferência', valor: 90000, ehTransferencia: true },
    ])
    expect(r).toHaveLength(1)
    expect(r[0].valor).toBe(10000)
  })

  it('ignora entradas — o relatório é de gastos', () => {
    const r = gastosPorCategoria([
      { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 10000 },
      { ...base, categoriaId: 'c', categoriaNome: 'Salário', valor: 400000, tipo: 'ENTRADA' },
    ])
    expect(r).toHaveLength(1)
  })

  it('filtra por dono quando pedido', () => {
    const r = gastosPorCategoria(
      [
        { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 10000, pessoaId: 'eu' },
        { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 90000, pessoaId: 'mae' },
      ],
      { donoId: 'eu', apenasDoDono: true },
    )
    expect(r[0].valor).toBe(10000)
  })

  it('agrupa cauda longa em "outros"', () => {
    const muitas = Array.from({ length: 8 }, (_, i) => ({
      ...base,
      categoriaId: `c${i}`,
      categoriaNome: `Cat ${i}`,
      valor: (8 - i) * 1000,
    }))
    const r = gastosPorCategoria(muitas, { maximoFatias: 3 })
    expect(r).toHaveLength(4)
    expect(r[3].nome).toBe('Outros')
    expect(r.reduce((s, f) => s + f.valor, 0)).toBe(muitas.reduce((s, l) => s + l.valor, 0))
  })

  it('sem lançamentos, devolve lista vazia sem dividir por zero', () => {
    expect(gastosPorCategoria([])).toEqual([])
  })

  it('lançamento sem categoria entra como "Sem categoria"', () => {
    const r = gastosPorCategoria([
      { ...base, categoriaId: null, categoriaNome: '', valor: 5000 },
    ])
    expect(r[0].nome).toBe('Sem categoria')
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/domain/categorias.test.ts`
Expected: FAIL — `Cannot find module './categorias'`.

- [ ] **Step 3: Implementar**

```ts
// src/domain/categorias.ts
import type { Centavos } from './dinheiro'

export type LancamentoAgregavel = {
  categoriaId: string | null
  categoriaNome: string
  valor: Centavos
  tipo: 'ENTRADA' | 'SAIDA'
  ehTransferencia: boolean
  pessoaId: string | null
}

export type FatiaCategoria = {
  nome: string
  valor: Centavos
  percentual: number
}

type Opcoes = {
  donoId?: string
  apenasDoDono?: boolean
  maximoFatias?: number
}

/**
 * Transferências entre contas próprias são excluídas porque mover dinheiro não
 * é gasto — incluí-las infla o total sem que ninguém perceba de onde veio.
 *
 * Entradas também saem: este é o relatório de para onde o dinheiro foi.
 */
export function gastosPorCategoria(
  lancamentos: LancamentoAgregavel[],
  opcoes: Opcoes = {},
): FatiaCategoria[] {
  const relevantes = lancamentos.filter((l) => {
    if (l.ehTransferencia || l.tipo !== 'SAIDA') return false
    if (opcoes.apenasDoDono && opcoes.donoId) {
      return l.pessoaId === null || l.pessoaId === opcoes.donoId
    }
    return true
  })

  const total = relevantes.reduce((s, l) => s + l.valor, 0)
  if (total === 0) return []

  const porNome = new Map<string, Centavos>()
  for (const l of relevantes) {
    const nome = l.categoriaNome.trim() || 'Sem categoria'
    porNome.set(nome, (porNome.get(nome) ?? 0) + l.valor)
  }

  const ordenadas = [...porNome.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)

  const limite = opcoes.maximoFatias
  const fatias =
    limite && ordenadas.length > limite
      ? [
          ...ordenadas.slice(0, limite),
          {
            nome: 'Outros',
            valor: ordenadas.slice(limite).reduce((s, f) => s + f.valor, 0),
          },
        ]
      : ordenadas

  return fatias.map((f) => ({
    ...f,
    percentual: Math.round((f.valor / total) * 1000) / 10,
  }))
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/domain/categorias.test.ts`
Expected: PASS, 7 testes.

- [ ] **Step 5: Commit**

```bash
git add src/domain/categorias.ts src/domain/categorias.test.ts
git commit -m "DOMAIN | FEAT | agregacao de gastos por categoria"
```

---

### Task 4: Domínio — saldos e parcelas com resto

**Files:**
- Create: `src/domain/saldos.ts`
- Test: `src/domain/saldos.test.ts`
- Modify: `src/domain/parcelamento.ts` (distribuição do resto)

**Interfaces:**
- Consumes: `Centavos`
- Produces:
  - `type LancamentoDeSaldo = { valor: Centavos; tipo: 'ENTRADA' | 'SAIDA'; status: 'PREVISTO' | 'EFETIVADO' | 'ATRASADO'; data: string }`
  - `function saldoAtual(saldoInicial: Centavos, lancamentos: LancamentoDeSaldo[]): Centavos`
  - `function saldoPrevisto(saldoInicial: Centavos, lancamentos: LancamentoDeSaldo[], ate: string): Centavos`
  - `function dividirEmParcelas(total: Centavos, n: number): Centavos[]`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/domain/saldos.test.ts
import { describe, it, expect } from 'vitest'
import { saldoAtual, saldoPrevisto, dividirEmParcelas } from './saldos'

const l = (valor: number, tipo: 'ENTRADA' | 'SAIDA', status: 'PREVISTO' | 'EFETIVADO' | 'ATRASADO', data: string) =>
  ({ valor, tipo, status, data })

describe('saldoAtual', () => {
  it('soma apenas lançamentos efetivados', () => {
    expect(
      saldoAtual(100000, [
        l(50000, 'ENTRADA', 'EFETIVADO', '2026-10-01'),
        l(30000, 'SAIDA', 'EFETIVADO', '2026-10-02'),
        l(99999, 'ENTRADA', 'PREVISTO', '2026-10-03'),
      ]),
    ).toBe(120000)
  })

  it('aceita saldo negativo', () => {
    expect(saldoAtual(0, [l(5000, 'SAIDA', 'EFETIVADO', '2026-10-01')])).toBe(-5000)
  })
})

describe('saldoPrevisto', () => {
  it('inclui previstos até a data alvo', () => {
    const ls = [
      l(50000, 'ENTRADA', 'EFETIVADO', '2026-10-01'),
      l(20000, 'SAIDA', 'PREVISTO', '2026-10-15'),
      l(90000, 'SAIDA', 'PREVISTO', '2026-11-20'),
    ]
    expect(saldoPrevisto(0, ls, '2026-10-31')).toBe(30000)
  })

  it('conta atrasados como ainda não pagos', () => {
    const ls = [l(20000, 'SAIDA', 'ATRASADO', '2026-09-10')]
    expect(saldoPrevisto(50000, ls, '2026-10-31')).toBe(30000)
  })
})

describe('dividirEmParcelas', () => {
  it('divide exato quando possível', () => {
    expect(dividirEmParcelas(30000, 3)).toEqual([10000, 10000, 10000])
  })

  it('a soma das parcelas é sempre igual ao total', () => {
    const p = dividirEmParcelas(10000, 3)
    expect(p.reduce((s, x) => s + x, 0)).toBe(10000)
  })

  it('coloca o resto na primeira parcela', () => {
    expect(dividirEmParcelas(10000, 3)).toEqual([3334, 3333, 3333])
  })

  it('recusa número de parcelas inválido', () => {
    expect(() => dividirEmParcelas(10000, 0)).toThrow()
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/domain/saldos.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```ts
// src/domain/saldos.ts
import type { Centavos } from './dinheiro'

export type LancamentoDeSaldo = {
  valor: Centavos
  tipo: 'ENTRADA' | 'SAIDA'
  status: 'PREVISTO' | 'EFETIVADO' | 'ATRASADO'
  data: string
}

const assinado = (l: LancamentoDeSaldo): Centavos =>
  l.tipo === 'ENTRADA' ? l.valor : -l.valor

/**
 * Saldo é derivado, nunca armazenado: um número gravado desatualiza assim que
 * alguém corrige um lançamento antigo, e não há como saber que mentiu.
 */
export function saldoAtual(
  saldoInicial: Centavos,
  lancamentos: LancamentoDeSaldo[],
): Centavos {
  return lancamentos
    .filter((l) => l.status === 'EFETIVADO')
    .reduce((s, l) => s + assinado(l), saldoInicial)
}

/**
 * Projeção até uma data. `ATRASADO` entra junto com `PREVISTO` porque atrasado
 * significa "ainda devo", não "já paguei" — tratá-lo como quitado produziria
 * uma projeção otimista justamente quando a pessoa mais precisa da verdade.
 */
export function saldoPrevisto(
  saldoInicial: Centavos,
  lancamentos: LancamentoDeSaldo[],
  ate: string,
): Centavos {
  return lancamentos
    .filter((l) => l.data <= ate)
    .reduce((s, l) => s + assinado(l), saldoInicial)
}

/**
 * Divide um total em N parcelas inteiras cuja soma é exatamente o total.
 * O resto vai na primeira parcela — convenção do mercado brasileiro, e a que
 * evita a soma das parcelas ficar um centavo abaixo da compra.
 */
export function dividirEmParcelas(total: Centavos, n: number): Centavos[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`número de parcelas inválido: ${n}`)
  }
  const base = Math.floor(total / n)
  const resto = total - base * n
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + resto : base))
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/domain/saldos.test.ts`
Expected: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
git add src/domain/saldos.ts src/domain/saldos.test.ts
git commit -m "DOMAIN | FEAT | saldo derivado e divisao de parcelas sem perder centavos"
```

---

### Task 5: Domínio — recorrência

**Files:**
- Create: `src/domain/recorrencia.ts`
- Test: `src/domain/recorrencia.test.ts`

**Interfaces:**
- Consumes: `Centavos`
- Produces:
  - `type DefinicaoRecorrencia = { valor: Centavos; diaDoMes: number; dataInicio: string; dataFim?: string | null }`
  - `type OcorrenciaGerada = { data: string; competencia: string; valor: Centavos }`
  - `function gerarOcorrencias(def: DefinicaoRecorrencia, deCompetencia: string, ateCompetencia: string): OcorrenciaGerada[]`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/domain/recorrencia.test.ts
import { describe, it, expect } from 'vitest'
import { gerarOcorrencias } from './recorrencia'

describe('gerarOcorrencias', () => {
  it('gera uma ocorrência por mês no dia indicado', () => {
    const r = gerarOcorrencias(
      { valor: 400000, diaDoMes: 5, dataInicio: '2026-01-01' },
      '2026-01',
      '2026-03',
    )
    expect(r.map((o) => o.data)).toEqual(['2026-01-05', '2026-02-05', '2026-03-05'])
  })

  it('dia 31 cai no último dia dos meses curtos', () => {
    const r = gerarOcorrencias(
      { valor: 10000, diaDoMes: 31, dataInicio: '2026-01-01' },
      '2026-01',
      '2026-04',
    )
    expect(r.map((o) => o.data)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })

  it('respeita ano bissexto', () => {
    const r = gerarOcorrencias(
      { valor: 10000, diaDoMes: 30, dataInicio: '2028-02-01' },
      '2028-02',
      '2028-02',
    )
    expect(r[0].data).toBe('2028-02-29')
  })

  it('não gera antes da data de início', () => {
    const r = gerarOcorrencias(
      { valor: 10000, diaDoMes: 10, dataInicio: '2026-03-01' },
      '2026-01',
      '2026-04',
    )
    expect(r.map((o) => o.competencia)).toEqual(['2026-03', '2026-04'])
  })

  it('para na data fim', () => {
    const r = gerarOcorrencias(
      { valor: 10000, diaDoMes: 10, dataInicio: '2026-01-01', dataFim: '2026-02-28' },
      '2026-01',
      '2026-06',
    )
    expect(r.map((o) => o.competencia)).toEqual(['2026-01', '2026-02'])
  })

  it('intervalo invertido devolve lista vazia', () => {
    expect(
      gerarOcorrencias({ valor: 100, diaDoMes: 1, dataInicio: '2026-01-01' }, '2026-06', '2026-01'),
    ).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/domain/recorrencia.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

```ts
// src/domain/recorrencia.ts
import type { Centavos } from './dinheiro'

export type DefinicaoRecorrencia = {
  valor: Centavos
  diaDoMes: number
  dataInicio: string
  dataFim?: string | null
}

export type OcorrenciaGerada = {
  data: string
  competencia: string
  valor: Centavos
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Último dia do mês, considerando bissexto, sem usar objeto Date. */
function ultimoDiaDoMes(ano: number, mes: number): number {
  const dias = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (mes === 2 && (ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0))) return 29
  return dias[mes - 1]
}

/**
 * Um lançamento marcado para o dia 31 não pode simplesmente sumir em fevereiro:
 * a conta existe e vence. O dia é limitado ao último do mês, que é o que todo
 * banco faz com débito automático.
 */
export function gerarOcorrencias(
  def: DefinicaoRecorrencia,
  deCompetencia: string,
  ateCompetencia: string,
): OcorrenciaGerada[] {
  if (deCompetencia > ateCompetencia) return []

  const [anoDe, mesDe] = deCompetencia.split('-').map(Number)
  const [anoAte, mesAte] = ateCompetencia.split('-').map(Number)

  const ocorrencias: OcorrenciaGerada[] = []
  let indice = anoDe * 12 + (mesDe - 1)
  const fim = anoAte * 12 + (mesAte - 1)

  while (indice <= fim) {
    const ano = Math.floor(indice / 12)
    const mes = (indice % 12) + 1
    const dia = Math.min(def.diaDoMes, ultimoDiaDoMes(ano, mes))
    const data = `${ano}-${pad(mes)}-${pad(dia)}`

    const dentroDoInicio = data >= def.dataInicio
    const dentroDoFim = !def.dataFim || data <= def.dataFim

    if (dentroDoInicio && dentroDoFim) {
      ocorrencias.push({ data, competencia: `${ano}-${pad(mes)}`, valor: def.valor })
    }

    indice += 1
  }

  return ocorrencias
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/domain/recorrencia.test.ts && npm test`
Expected: PASS — 6 testes novos, suíte inteira verde.

- [ ] **Step 5: Commit**

```bash
git add src/domain/recorrencia.ts src/domain/recorrencia.test.ts
git commit -m "DOMAIN | FEAT | geracao de ocorrencias com limite de dia do mes"
```

---

### Task 6: Casos de uso — lançamentos

**Files:**
- Create: `src/server/tipos.ts`, `src/server/lancamentos.ts`
- Test: `src/server/tipos.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), domínio das Tasks 3–5
- Produces:
  - `function competenciaDe(data: string, conta: { tipo: string; diaFechamento: number | null }): string`
  - `async function criarLancamento(input: CriarLancamentoInput): Promise<string>`
  - `async function criarParcelamento(input: CriarParcelamentoInput): Promise<string>`
  - `async function listarLancamentos(filtros: FiltrosLancamento): Promise<LancamentoListado[]>`

- [ ] **Step 1: Escrever o teste de competência (pura, sem banco)**

```ts
// src/server/tipos.test.ts
import { describe, it, expect } from 'vitest'
import { competenciaDe } from './tipos'

describe('competenciaDe', () => {
  it('conta comum usa o mês da data', () => {
    expect(competenciaDe('2026-08-20', { tipo: 'CORRENTE', diaFechamento: null })).toBe('2026-08')
  })

  it('cartão antes do fechamento cai no mês', () => {
    expect(competenciaDe('2026-08-10', { tipo: 'CARTAO', diaFechamento: 15 })).toBe('2026-08')
  })

  it('cartão depois do fechamento cai no mês seguinte', () => {
    expect(competenciaDe('2026-08-20', { tipo: 'CARTAO', diaFechamento: 15 })).toBe('2026-09')
  })

  it('cartão em dezembro depois do fechamento vira janeiro', () => {
    expect(competenciaDe('2026-12-20', { tipo: 'CARTAO', diaFechamento: 15 })).toBe('2027-01')
  })

  it('cartão sem dia de fechamento usa o mês da data', () => {
    expect(competenciaDe('2026-08-20', { tipo: 'CARTAO', diaFechamento: null })).toBe('2026-08')
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/server/tipos.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `tipos.ts`**

Arquivo sem import de `./db`, de propósito: `db.ts` instancia o PrismaClient em tempo de import, e um teste que alcance esse import fica pendurado tentando conectar.

```ts
// src/server/tipos.ts
import { competenciaDaCompra } from '@/domain/fatura'

export type TipoMovimento = 'ENTRADA' | 'SAIDA'
export type StatusLancamento = 'PREVISTO' | 'EFETIVADO' | 'ATRASADO'

/**
 * Cartão tem calendário próprio: o que passa depois do fechamento é cobrado na
 * fatura seguinte. Errar isso desloca gastos de fim de mês em um mês inteiro —
 * justamente os que mais afetam a previsão.
 */
export function competenciaDe(
  data: string,
  conta: { tipo: string; diaFechamento: number | null },
): string {
  if (conta.tipo === 'CARTAO' && conta.diaFechamento) {
    return competenciaDaCompra(data, {
      diaFechamento: conta.diaFechamento,
      diaVencimento: conta.diaFechamento,
    }).competencia
  }
  return data.slice(0, 7)
}
```

- [ ] **Step 4: Implementar `lancamentos.ts`**

```ts
// src/server/lancamentos.ts
import { prisma } from './db'
import { competenciaDe, type TipoMovimento, type StatusLancamento } from './tipos'
import { dividirEmParcelas } from '@/domain/saldos'
import type { Centavos } from '@/domain/dinheiro'

export type CriarLancamentoInput = {
  descricao: string
  valor: Centavos
  tipo: TipoMovimento
  data: string
  contaId: string
  categoriaId?: string | null
  pessoaId?: string | null
  status?: StatusLancamento
}

export async function criarLancamento(input: CriarLancamentoInput): Promise<string> {
  const conta = await prisma.conta.findUniqueOrThrow({ where: { id: input.contaId } })

  const criado = await prisma.lancamento.create({
    data: {
      descricao: input.descricao,
      valor: input.valor,
      tipo: input.tipo,
      data: input.data,
      competencia: competenciaDe(input.data, conta),
      status: input.status ?? 'EFETIVADO',
      contaId: input.contaId,
      categoriaId: input.categoriaId ?? null,
      pessoaId: input.pessoaId ?? null,
    },
  })

  return criado.id
}

export type CriarParcelamentoInput = {
  descricao: string
  valorTotal: Centavos
  numeroParcelas: number
  dataInicio: string
  contaId: string
  categoriaId?: string | null
  pessoaId?: string | null
}

/**
 * Cria o parcelamento e suas parcelas num `create` aninhado — não em transação
 * interativa, que é incompatível com pooler em transaction mode. As escritas
 * relacionadas vão declaradas de uma vez, sem lógica no meio.
 */
export async function criarParcelamento(input: CriarParcelamentoInput): Promise<string> {
  const conta = await prisma.conta.findUniqueOrThrow({ where: { id: input.contaId } })
  const valores = dividirEmParcelas(input.valorTotal, input.numeroParcelas)
  const hoje = new Date().toISOString().slice(0, 10)

  const primeira = competenciaDe(input.dataInicio, conta)
  const [anoBase, mesBase] = primeira.split('-').map(Number)
  const diaVenc = conta.diaVencimento ?? Number(input.dataInicio.slice(8, 10))

  const criado = await prisma.parcelamento.create({
    data: {
      descricao: input.descricao,
      valorParcela: valores[0],
      numeroParcelas: input.numeroParcelas,
      dataInicio: input.dataInicio,
      contaId: input.contaId,
      categoriaId: input.categoriaId ?? null,
      pessoaId: input.pessoaId ?? null,
      lancamentos: {
        create: valores.map((valor, i) => {
          const total = anoBase * 12 + (mesBase - 1) + i
          const ano = Math.floor(total / 12)
          const mes = (total % 12) + 1
          const competencia = `${ano}-${String(mes).padStart(2, '0')}`
          const data = `${competencia}-${String(diaVenc).padStart(2, '0')}`
          return {
            descricao: `${input.descricao} (${i + 1}/${input.numeroParcelas})`,
            valor,
            tipo: 'SAIDA' as const,
            data,
            competencia,
            status: (competencia < hoje.slice(0, 7) ? 'EFETIVADO' : 'PREVISTO') as const,
            contaId: input.contaId,
            categoriaId: input.categoriaId ?? null,
            pessoaId: input.pessoaId ?? null,
            numeroParcela: i + 1,
            totalParcelas: input.numeroParcelas,
          }
        }),
      },
    },
  })

  return criado.id
}

export type FiltrosLancamento = {
  competencia?: string
  contaId?: string
  categoriaId?: string
  pessoaId?: string
  status?: StatusLancamento
}

export async function listarLancamentos(filtros: FiltrosLancamento) {
  return prisma.lancamento.findMany({
    where: {
      ...(filtros.competencia ? { competencia: filtros.competencia } : {}),
      ...(filtros.contaId ? { contaId: filtros.contaId } : {}),
      ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
      ...(filtros.pessoaId ? { pessoaId: filtros.pessoaId } : {}),
      ...(filtros.status ? { status: filtros.status } : {}),
    },
    include: { conta: true, categoria: true, pessoa: true },
    orderBy: [{ data: 'asc' }, { criadoEm: 'asc' }],
  })
}
```

- [ ] **Step 5: Rodar e verificar**

Run: `npx vitest run src/server/tipos.test.ts && npx tsc --noEmit`
Expected: PASS, 5 testes; tipos limpos.

- [ ] **Step 6: Commit**

```bash
git add src/server/
git commit -m "SERVER | FEAT | casos de uso de lancamento e parcelamento"
```

---

### Task 7: Casos de uso — contas, transferências e recorrências

**Files:**
- Create: `src/server/contas.ts`, `src/server/recorrencias.ts`
- Test: `src/server/transferencia.test.ts`

**Interfaces:**
- Consumes: `prisma`, `saldoAtual`/`saldoPrevisto` (Task 4), `gerarOcorrencias` (Task 5)
- Produces:
  - `function validarTransferencia(origemId: string, destinoId: string, valor: number): string | null`
  - `async function criarTransferencia(input: CriarTransferenciaInput): Promise<string>`
  - `async function listarContasComSaldo(): Promise<ContaComSaldo[]>`
  - `async function materializarRecorrencia(recorrenciaId: string, ateCompetencia: string): Promise<number>`

- [ ] **Step 1: Escrever o teste de validação**

```ts
// src/server/transferencia.test.ts
import { describe, it, expect } from 'vitest'
import { validarTransferencia } from './contas'

describe('validarTransferencia', () => {
  it('aceita contas diferentes com valor positivo', () => {
    expect(validarTransferencia('a', 'b', 10000)).toBeNull()
  })

  it('recusa origem igual ao destino', () => {
    expect(validarTransferencia('a', 'a', 10000)).toMatch(/mesma conta/i)
  })

  it('recusa valor zero ou negativo', () => {
    expect(validarTransferencia('a', 'b', 0)).toMatch(/maior que zero/i)
    expect(validarTransferencia('a', 'b', -100)).toMatch(/maior que zero/i)
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/server/transferencia.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `contas.ts`**

```ts
// src/server/contas.ts
import { prisma } from './db'
import { saldoAtual, saldoPrevisto, type LancamentoDeSaldo } from '@/domain/saldos'
import type { Centavos } from '@/domain/dinheiro'

/**
 * Transferir para a própria conta criaria um par de lançamentos que se anulam:
 * o saldo não muda, mas o extrato ganha duas linhas falsas e todo relatório
 * passa a ter ruído que ninguém consegue explicar depois.
 */
export function validarTransferencia(
  origemId: string,
  destinoId: string,
  valor: number,
): string | null {
  if (origemId === destinoId) return 'Origem e destino não podem ser a mesma conta.'
  if (valor <= 0) return 'O valor precisa ser maior que zero.'
  return null
}

export type CriarTransferenciaInput = {
  data: string
  valor: Centavos
  contaOrigemId: string
  contaDestinoId: string
  descricao?: string
}

export async function criarTransferencia(input: CriarTransferenciaInput): Promise<string> {
  const erro = validarTransferencia(input.contaOrigemId, input.contaDestinoId, input.valor)
  if (erro) throw new Error(erro)

  const [origem, destino] = await Promise.all([
    prisma.conta.findUniqueOrThrow({ where: { id: input.contaOrigemId } }),
    prisma.conta.findUniqueOrThrow({ where: { id: input.contaDestinoId } }),
  ])

  const competencia = input.data.slice(0, 7)
  const descricao = input.descricao?.trim() || `Transferência ${origem.nome} → ${destino.nome}`

  const criada = await prisma.transferencia.create({
    data: {
      data: input.data,
      valor: input.valor,
      contaOrigemId: input.contaOrigemId,
      contaDestinoId: input.contaDestinoId,
      lancamentos: {
        create: [
          {
            descricao,
            valor: input.valor,
            tipo: 'SAIDA',
            data: input.data,
            competencia,
            status: 'EFETIVADO',
            contaId: input.contaOrigemId,
          },
          {
            descricao,
            valor: input.valor,
            tipo: 'ENTRADA',
            data: input.data,
            competencia,
            status: 'EFETIVADO',
            contaId: input.contaDestinoId,
          },
        ],
      },
    },
  })

  return criada.id
}

export type ContaComSaldo = {
  id: string
  nome: string
  tipo: string
  saldo: Centavos
  previsto: Centavos
}

export async function listarContasComSaldo(ate?: string): Promise<ContaComSaldo[]> {
  const contas = await prisma.conta.findMany({
    where: { ativa: true },
    include: { lancamentos: true },
    orderBy: { nome: 'asc' },
  })

  const limite = ate ?? '9999-12-31'

  return contas.map((c) => {
    const ls: LancamentoDeSaldo[] = c.lancamentos.map((l) => ({
      valor: l.valor,
      tipo: l.tipo,
      status: l.status,
      data: l.data,
    }))
    return {
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      saldo: saldoAtual(c.saldoInicial, ls),
      previsto: saldoPrevisto(c.saldoInicial, ls, limite),
    }
  })
}
```

- [ ] **Step 4: Implementar `recorrencias.ts`**

```ts
// src/server/recorrencias.ts
import { prisma } from './db'
import { gerarOcorrencias } from '@/domain/recorrencia'

/**
 * Materializa as ocorrências de uma recorrência até a competência informada,
 * pulando as que já existem. Idempotente: rodar duas vezes não duplica.
 */
export async function materializarRecorrencia(
  recorrenciaId: string,
  ateCompetencia: string,
): Promise<number> {
  const r = await prisma.recorrencia.findUniqueOrThrow({
    where: { id: recorrenciaId },
    include: { lancamentos: true },
  })

  if (!r.ativa) return 0

  const jaExistem = new Set(r.lancamentos.map((l) => l.competencia))

  const ocorrencias = gerarOcorrencias(
    { valor: r.valor, diaDoMes: r.diaDoMes, dataInicio: r.dataInicio, dataFim: r.dataFim },
    r.dataInicio.slice(0, 7),
    ateCompetencia,
  ).filter((o) => !jaExistem.has(o.competencia))

  if (ocorrencias.length === 0) return 0

  const hoje = new Date().toISOString().slice(0, 10)

  await prisma.lancamento.createMany({
    data: ocorrencias.map((o) => ({
      descricao: r.descricao,
      valor: o.valor,
      tipo: r.tipo,
      data: o.data,
      competencia: o.competencia,
      status: o.data < hoje ? ('EFETIVADO' as const) : ('PREVISTO' as const),
      contaId: r.contaId,
      categoriaId: r.categoriaId,
      recorrenciaId: r.id,
    })),
  })

  return ocorrencias.length
}
```

- [ ] **Step 5: Rodar e verificar**

Run: `npx vitest run src/server/ && npx tsc --noEmit`
Expected: PASS, 8 testes de servidor; tipos limpos.

- [ ] **Step 6: Commit**

```bash
git add src/server/
git commit -m "SERVER | FEAT | contas com saldo transferencias e recorrencias"
```

---

### Task 8: Design tokens e layout

**Files:**
- Create: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/Navegacao.tsx`, `src/components/Cabecalho.tsx`
- Modify: componentes migrados que referenciem tokens antigos

**Interfaces:**
- Consumes: `Preferencias`, `Valor`, `AcoesTopo` (migrados)
- Produces: tokens CSS, modo claro/escuro, navegação de 5 telas

- [ ] **Step 1: Criar `globals.css` com os tokens**

Mesma estrutura do projeto anterior: tokens em `@theme`, modo escuro por redefinição em `.dark`, foco visível, `prefers-reduced-motion`. Navegação ganha 5 itens em vez de 3.

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-roxo: #8a19d6;
  --color-roxo-escuro: #7314b3;
  --color-fundo: #ffffff;
  --color-superficie: #f0f1f5;
  --color-cinza-forte: #e2e3ea;
  --color-texto: #000000;
  --color-texto-suave: #7a7a80;
  --color-cinza: #f0f1f5;
  --color-faixa-verde: #00dd16;
  --color-faixa-azul: #009bdd;
  --color-faixa-laranja: #ff7900;
  --radius-card: 12px;
  --radius-bloco: 24px;
  --radius-pill: 999px;
  --font-sans: var(--fonte-montserrat), ui-sans-serif, system-ui, sans-serif;
}

.dark {
  --color-fundo: #000000;
  --color-superficie: #161616;
  --color-cinza-forte: #232323;
  --color-texto: #ffffff;
  --color-texto-suave: #9a9aa2;
  --color-cinza: #161616;
}

body { background: var(--color-fundo); color: var(--color-texto); }
:focus-visible { outline: 2px solid var(--color-roxo); outline-offset: 2px; border-radius: 4px; }
.faixa-roxa :focus-visible { outline-color: #ffffff; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

- [ ] **Step 2: Criar `layout.tsx` com Montserrat e Preferencias**

```tsx
import './globals.css'
import { Montserrat } from 'next/font/google'
import { Navegacao } from '@/components/Navegacao'
import { Preferencias } from '@/components/Preferencias'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--fonte-montserrat',
  display: 'swap',
})

export const metadata = {
  title: 'Caixa',
  description: 'Controle financeiro pessoal self-hosted',
}

export const viewport = { themeColor: '#8A19D6' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={montserrat.variable} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <Preferencias>
          {children}
          <Navegacao />
        </Preferencias>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Criar `Navegacao.tsx` com as cinco telas**

Mesma estrutura do projeto anterior (barra superior no desktop, inferior no mobile), com os itens: Painel `/`, Lançamentos `/lancamentos`, Contas `/contas`, Pessoas `/pessoas`, Cadastros `/cadastros`.

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: compila sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/app/ src/components/
git commit -m "UI | FEAT | tokens de design layout e navegacao"
```

---

### Task 9: Tela de painel

**Files:**
- Create: `src/app/page.tsx`, `src/server/painel.ts`, `src/components/PrimeiroAcesso.tsx`, `src/app/acoes.ts`

**Interfaces:**
- Consumes: `listarContasComSaldo` (7), `gastosPorCategoria` (3), `linhaDoTempo` (migrado), `saldosPorPessoa` (migrado)
- Produces: `async function carregarPainel(competencia: string): Promise<ResumoPainel | null>`

- [ ] **Step 1: Implementar `painel.ts`**

Agrega: saldo consolidado, linha do tempo do mês a partir dos lançamentos, composição por categoria, saldos por pessoa, alerta de saldo negativo. Devolve `null` quando não há dono — banco vazio é o primeiro estado de toda instalação, não condição excepcional.

- [ ] **Step 2: Implementar `PrimeiroAcesso.tsx`**

Client component com `useActionState`, exibindo erro em texto. Cria dono, primeira conta e um conjunto inicial de categorias comuns (Moradia, Alimentação, Transporte, Saúde, Lazer, Salário, Outros) — sem categorias o sistema nasce inútil e a pessoa não sabe por onde começar.

- [ ] **Step 3: Implementar `page.tsx`**

Cabeçalho com saldo consolidado, blocos de alerta, barra de composição, linha do tempo, atalhos redondos.

- [ ] **Step 4: Verificar com banco vazio**

Run: `npm run build && npm run start`
Expected: HTTP 200 na raiz com banco vazio, exibindo a tela de configuração.

- [ ] **Step 5: Commit**

```bash
git add src/app/ src/server/painel.ts src/components/
git commit -m "UI | FEAT | painel com saldo consolidado e primeiro acesso"
```

---

### Task 10: Tela de lançamentos

**Files:**
- Create: `src/app/lancamentos/page.tsx`, `src/app/lancamentos/acoes.ts`, `src/components/FiltrosLancamento.tsx`, `src/components/ListaLancamentos.tsx`

**Interfaces:**
- Consumes: `listarLancamentos`, `criarLancamento` (6)
- Produces: rota `/lancamentos` com filtros em `searchParams`

- [ ] **Step 1: Implementar os filtros como estado de URL**

`?competencia=2026-10&contaId=x&categoriaId=y&pessoaId=z&status=PREVISTO`. Filtro em estado interno quebra o botão voltar, impede compartilhar a visão e perde tudo ao recarregar.

- [ ] **Step 2: Implementar a lista com ações de status**

Cada linha permite alternar entre previsto, efetivado e atrasado.

- [ ] **Step 3: Implementar o formulário de lançamento avulso**

Campos: descrição, valor, tipo, data, conta, categoria, pessoa (opcional).

- [ ] **Step 4: Verificar**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/app/lancamentos/ src/components/
git commit -m "UI | FEAT | tela de lancamentos com filtros em url"
```

---

### Task 11: Telas de contas, pessoas e cadastros

**Files:**
- Create: `src/app/contas/{page.tsx,acoes.ts}`, `src/app/pessoas/{page.tsx,acoes.ts}`, `src/app/cadastros/{page.tsx,acoes.ts}`

**Interfaces:**
- Consumes: Tasks 6 e 7
- Produces: rotas `/contas`, `/pessoas`, `/cadastros`

- [ ] **Step 1: `/contas`** — lista com saldo atual e previsto, criação de conta, transferência entre contas com validação exibida em texto

- [ ] **Step 2: `/pessoas`** — saldo devedor por pessoa, registro de pagamento recebido, cadastro de pessoa

- [ ] **Step 3: `/cadastros`** — categorias (com cor e tipo), recorrências, parcelamentos, antecipações. Excluir categoria **desativa** em vez de apagar, preservando o histórico dos relatórios

- [ ] **Step 4: Verificar**

Run: `npm run build && npm test && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/app/
git commit -m "UI | FEAT | telas de contas pessoas e cadastros"
```

---

# FASE 2 — Relatórios

### Task 12: Domínio dos relatórios

**Files:**
- Create: `src/domain/relatorios.ts`
- Test: `src/domain/relatorios.test.ts`

**Interfaces:**
- Consumes: `Centavos`
- Produces:
  - `type PontoMensal = { competencia: string; entradas: Centavos; saidas: Centavos }`
  - `function serieMensal(lancamentos: { competencia: string; valor: Centavos; tipo: 'ENTRADA'|'SAIDA'; ehTransferencia: boolean }[], de: string, ate: string): PontoMensal[]`
  - `function normalizarPeriodo(de: string, ate: string): { de: string; ate: string }`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/domain/relatorios.test.ts
import { describe, it, expect } from 'vitest'
import { serieMensal, normalizarPeriodo } from './relatorios'

describe('normalizarPeriodo', () => {
  it('mantém período correto', () => {
    expect(normalizarPeriodo('2026-01', '2026-06')).toEqual({ de: '2026-01', ate: '2026-06' })
  })

  it('inverte período invertido em vez de somar errado', () => {
    expect(normalizarPeriodo('2026-12', '2026-01')).toEqual({ de: '2026-01', ate: '2026-12' })
  })
})

describe('serieMensal', () => {
  const l = (competencia: string, valor: number, tipo: 'ENTRADA' | 'SAIDA') =>
    ({ competencia, valor, tipo, ehTransferencia: false })

  it('agrupa entradas e saídas por mês', () => {
    const r = serieMensal(
      [l('2026-01', 400000, 'ENTRADA'), l('2026-01', 150000, 'SAIDA')],
      '2026-01',
      '2026-01',
    )
    expect(r).toEqual([{ competencia: '2026-01', entradas: 400000, saidas: 150000 }])
  })

  it('preenche meses sem lançamento com zero, não com buraco', () => {
    const r = serieMensal([l('2026-03', 1000, 'ENTRADA')], '2026-01', '2026-03')
    expect(r.map((p) => p.competencia)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(r[0]).toEqual({ competencia: '2026-01', entradas: 0, saidas: 0 })
  })

  it('exclui transferências', () => {
    const r = serieMensal(
      [{ competencia: '2026-01', valor: 99999, tipo: 'SAIDA', ehTransferencia: true }],
      '2026-01',
      '2026-01',
    )
    expect(r[0].saidas).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/domain/relatorios.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar**

Mês sem lançamento vira ponto com zero e não ausência: um gráfico que pula meses vazios comprime o eixo do tempo e faz um ano irregular parecer regular.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/domain/relatorios.test.ts`
Expected: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/domain/relatorios.ts src/domain/relatorios.test.ts
git commit -m "DOMAIN | FEAT | series mensais e normalizacao de periodo"
```

---

### Task 13: Gráficos em SVG

**Files:**
- Create: `src/components/graficos/{Rosca,Barras,Linha}.tsx`

**Interfaces:**
- Consumes: `FatiaCategoria` (3), `PontoMensal` (12)
- Produces: três componentes de servidor, sem biblioteca externa

- [ ] **Step 1: `Rosca.tsx`** — fatias proporcionais com `stroke-dasharray` num círculo, `role="img"` e `aria-label` descrevendo os dados

- [ ] **Step 2: `Barras.tsx`** — entradas e saídas lado a lado por mês, eixo com rótulos

- [ ] **Step 3: `Linha.tsx`** — evolução do saldo, com traço contínuo para efetivado e interrompido para previsto. Misturar fato e projeção numa linha contínua induz a decidir com base em suposição acreditando que é histórico

- [ ] **Step 4: Verificar build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/graficos/
git commit -m "UI | FEAT | graficos em svg sem biblioteca externa"
```

---

### Task 14: Tela de relatórios

**Files:**
- Create: `src/app/relatorios/page.tsx`, `src/server/relatorios.ts`

**Interfaces:**
- Consumes: Tasks 12 e 13
- Produces: rota `/relatorios` com período em `searchParams`

- [ ] **Step 1: Implementar as consultas agregadas**

`GROUP BY` no banco em vez de carregar e somar em memória — retorno direto da unificação da Fase 1.

- [ ] **Step 2: Montar a tela**

Três blocos: para onde foi o dinheiro (rosca + tabela), mês a mês (barras), evolução do saldo (linha). Alternador entre "meus gastos" e "tudo que passou nas contas".

- [ ] **Step 3: Adicionar `/relatorios` à navegação**

- [ ] **Step 4: Verificar**

Run: `npm run build && npm test`

- [ ] **Step 5: Commit**

```bash
git add src/app/relatorios/ src/server/relatorios.ts src/components/Navegacao.tsx
git commit -m "UI | FEAT | tela de relatorios com tres visoes"
```

---

# FASE 3 — Produto público

### Task 15: Seed de demonstração

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- Consumes: casos de uso das Tasks 6 e 7
- Produces: `npm run db:seed`

- [ ] **Step 1: Escrever um perfil fictício coerente**

Salário, aluguel, contas fixas, cartão com fechamento e vencimento, compras parceladas em andamento, duas pessoas devendo, categorias preenchidas, três meses de histórico.

Coerência importa mais que volume: dados aleatórios produzem gráficos sem sentido — mercado maior que o salário — e o visitante conclui que o sistema está errado, não que os dados são falsos.

Nenhum nome real. Nada que remeta a pessoas de verdade.

- [ ] **Step 2: Tornar idempotente**

Se já houver dono, não faz nada.

- [ ] **Step 3: Verificar**

Run: `npm run db:seed && npm run db:seed`
Expected: segunda execução não duplica.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "SEED | FEAT | perfil de demonstracao coerente"
```

---

### Task 16: Subir com um comando

**Files:**
- Create: `Dockerfile`, `docker-compose.demo.yml`, `docker/entrypoint.sh`

**Interfaces:**
- Produces: `docker compose -f docker-compose.demo.yml up` levanta banco, schema e seed

- [ ] **Step 1: `Dockerfile` multi-stage** — build e runtime separados, `prisma generate` no build

- [ ] **Step 2: `entrypoint.sh`** — espera o banco, aplica `db push`, roda o seed se vazio, inicia o servidor

- [ ] **Step 3: Verificar numa pasta limpa, cronometrando**

Run: `git clone <repo> /tmp/teste && cd /tmp/teste && docker compose -f docker-compose.demo.yml up`
Expected: aplicação acessível em menos de 5 minutos, com dados de demonstração.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.demo.yml docker/
git commit -m "INFRA | FEAT | subir aplicacao completa com um comando"
```

---

### Task 17: Capturas de tela

**Files:**
- Create: `docs/capturas/*.png`, `scripts/capturar.ts`

- [ ] **Step 1: Script que sobe a aplicação com o seed e captura as telas** em claro e escuro, 1280px e 390px

- [ ] **Step 2: Gerar as capturas**

- [ ] **Step 3: Commit**

```bash
git add docs/capturas/ scripts/capturar.ts
git commit -m "DOCS | FEAT | capturas de tela geradas do seed de demonstracao"
```

---

### Task 18: README, licença e contribuição

**Files:**
- Create: `README.md`, `LICENSE`, `CONTRIBUTING.md`

- [ ] **Step 1: README na ordem que importa** — o que é (com captura), o que resolve, como rodar em três comandos, arquitetura, e a seção "Decisões que não são óbvias"

A seção de decisões é a que diferencia portfólio de tutorial: mostra raciocínio, não execução. Entram centavos em inteiro, datas como string, status nunca inferido da data, tabela única de lançamentos, saldo derivado, transferência fora dos relatórios de gasto.

- [ ] **Step 2: Créditos do design** — identidade visual replicada de arquivos públicos da comunidade no Figma, com link para as fontes, como exercício de implementação. Sem logo nem nome de marca na aplicação

- [ ] **Step 3: `LICENSE`** — MIT

- [ ] **Step 4: `CONTRIBUTING.md`** — setup, testes, e a regra que mantém a arquitetura viva: `domain/` não importa Prisma nem React. Sem isso escrito, a primeira contribuição externa coloca uma consulta ao banco dentro de uma função de domínio

- [ ] **Step 5: Commit**

```bash
git add README.md LICENSE CONTRIBUTING.md
git commit -m "DOCS | FEAT | readme licenca e guia de contribuicao"
```

---

## Verificação final

- [ ] `npm test` — toda a suíte passa
- [ ] `npx tsc --noEmit` — sem erros de tipo
- [ ] `npm run build` — build de produção limpo
- [ ] Banco vazio abre a tela de primeiro acesso, não erro 500
- [ ] Recorrência no dia 31 gera ocorrência em fevereiro
- [ ] Parcelas de R$ 100 em 3× somam exatamente R$ 100
- [ ] Transferência entre a mesma conta é recusada com mensagem
- [ ] Período invertido no relatório não soma errado
- [ ] Categoria desativada preserva o histórico
- [ ] Nenhum dado pessoal em código, seed, README ou histórico
- [ ] Clone limpo roda em menos de 5 minutos pelo README
