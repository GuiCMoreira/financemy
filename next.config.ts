import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * `standalone` empacota só o necessário para rodar, com as dependências
   * resolvidas. Sem isso a imagem Docker carregaria `node_modules` inteiro —
   * centenas de megabytes para servir algumas dezenas.
   */
  output: 'standalone',
}

export default nextConfig
