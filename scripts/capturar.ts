/**
 * Gera as capturas do README a partir da instância de demonstração.
 *
 * Pré-requisito: a aplicação rodando com o seed carregado.
 *
 *   docker compose -f docker-compose.demo.yml up -d
 *   npx tsx scripts/capturar.ts
 *
 * As capturas ficam em docs/capturas/. Regere-as sempre que alterar layout:
 * um README cuja primeira imagem não corresponde à tela perde credibilidade
 * de imediato.
 */
import { chromium, type Page } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const DESTINO = 'docs/capturas'

const TELAS = [
  { caminho: '/', nome: 'painel' },
  { caminho: '/lancamentos', nome: 'lancamentos' },
  { caminho: '/relatorios', nome: 'relatorios' },
  { caminho: '/contas', nome: 'contas' },
] as const

const TAMANHOS = [
  { nome: 'desktop', width: 1280, height: 900 },
  { nome: 'mobile', width: 390, height: 844 },
] as const

/** O tema vive em localStorage; definir antes de navegar evita capturar o flash. */
async function definirTema(page: Page, tema: 'claro' | 'escuro') {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('financas:tema', t)
    } catch {}
  }, tema)
}

async function main() {
  await mkdir(DESTINO, { recursive: true })

  const navegador = await chromium.launch()
  let geradas = 0

  for (const tema of ['claro', 'escuro'] as const) {
    for (const tamanho of TAMANHOS) {
      const contexto = await navegador.newContext({
        viewport: { width: tamanho.width, height: tamanho.height },
        deviceScaleFactor: 2,
      })
      const page = await contexto.newPage()
      await definirTema(page, tema)

      for (const tela of TELAS) {
        await page.goto(`${BASE}${tela.caminho}`, { waitUntil: 'networkidle' })
        // Dá tempo das fontes assentarem antes de capturar.
        await page.waitForTimeout(400)

        const arquivo = `${DESTINO}/${tela.nome}-${tamanho.nome}-${tema}.png`
        await page.screenshot({ path: arquivo })
        console.log(`  ${arquivo}`)
        geradas += 1
      }

      await contexto.close()
    }
  }

  await navegador.close()
  console.log(`\n${geradas} capturas geradas em ${DESTINO}/`)
}

main().catch((e) => {
  console.error('falhou:', e.message)
  process.exit(1)
})
