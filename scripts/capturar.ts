/**
 * Gera as capturas do README a partir da instância de demonstração.
 *
 * Pré-requisito: a aplicação rodando com o seed carregado.
 *
 *   docker compose -f docker-compose.demo.yml up -d
 *   npx tsx scripts/capturar.ts
 *
 * A instancia exige senha; o script loga com SENHA_ACESSO (padrao: demo).
 *
 * As capturas ficam em docs/capturas/. Regere-as sempre que alterar layout:
 * um README cuja primeira imagem não corresponde à tela perde credibilidade
 * de imediato.
 */
import { chromium, type Browser, type Page } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const SENHA = process.env.SENHA_ACESSO ?? 'demo'
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

/**
 * Faz login uma vez e devolve o estado do cookie, reusado por todos os
 * contextos. Sem isto, cada captura sairia sendo a tela de login — e o erro
 * só apareceria ao abrir o README, depois de já ter sobrescrito as imagens.
 */
async function autenticar(navegador: Browser) {
  const contexto = await navegador.newContext()
  const page = await contexto.newPage()

  await page.goto(`${BASE}/login`)
  await page.fill('input[name="senha"]', SENHA)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 })

  const estado = await contexto.storageState()
  await contexto.close()
  return estado
}

async function main() {
  await mkdir(DESTINO, { recursive: true })

  const navegador = await chromium.launch()
  const sessao = await autenticar(navegador)
  let geradas = 0

  for (const tema of ['claro', 'escuro'] as const) {
    for (const tamanho of TAMANHOS) {
      const contexto = await navegador.newContext({
        viewport: { width: tamanho.width, height: tamanho.height },
        deviceScaleFactor: 2,
        storageState: sessao,
      })
      const page = await contexto.newPage()
      await definirTema(page, tema)

      for (const tela of TELAS) {
        await page.goto(`${BASE}${tela.caminho}`, { waitUntil: 'networkidle' })
        // Dá tempo das fontes assentarem antes de capturar.
        await page.waitForTimeout(400)

        if (new URL(page.url()).pathname.startsWith('/login')) {
          throw new Error(
            `sessao perdida em ${tela.caminho} — conferir SENHA_ACESSO da instancia`,
          )
        }

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
