import { AcoesTopo } from './AcoesTopo'
import { Valor } from './Valor'
import type { Centavos } from '@/domain/dinheiro'

type Props = {
  titulo: string
  rotulo: string
  valor: Centavos
  complemento?: string
}

/**
 * Faixa roxa do topo. O valor em destaque fica fora dela, sobre o fundo claro:
 * mais área colorida lê como uma cor diferente e pesa a tela, e o número é o
 * que precisa de leitura, não de moldura.
 */
export function Cabecalho({ titulo, rotulo, valor, complemento }: Props) {
  return (
    <>
      <header className="faixa-roxa bg-roxo px-6 pt-12 pb-9 lg:px-12 lg:pt-[84px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-lg font-bold text-white">{titulo}</p>
          <AcoesTopo />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pt-8 lg:px-12">
        <p className="text-2xl font-medium text-texto">{rotulo}</p>
        <Valor centavos={valor} className="mt-1 block text-[32px] font-bold text-texto" />
        {complemento && (
          <p className="mt-1 text-xs font-medium text-texto-suave">{complemento}</p>
        )}
      </div>
    </>
  )
}
