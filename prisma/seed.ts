import 'dotenv/config'
import { prisma } from '../src/server/db'
import { criarLancamento, criarParcelamento } from '../src/server/lancamentos'
import { criarTransferencia } from '../src/server/contas'
import { materializarRecorrencia } from '../src/server/recorrencias'
import { somarMeses } from '../src/server/tipos'

/**
 * Perfil de demonstração — pessoas e valores fictícios.
 *
 * Coerência importa mais que volume: dados aleatórios produzem gráficos sem
 * sentido (mercado maior que o salário, categorias sem relação com o histórico)
 * e o visitante conclui que o sistema está errado, não que os dados são falsos.
 *
 * Idempotente: se já houver dono, não faz nada.
 */

const hoje = new Date().toISOString().slice(0, 10)
const mesAtual = hoje.slice(0, 7)
const reais = (v: number) => Math.round(v * 100)

async function main() {
  if (await prisma.pessoa.count()) {
    console.log('banco já tem dados; nada a fazer')
    return
  }

  const [eu, ana, bruno] = await Promise.all([
    prisma.pessoa.create({ data: { nome: 'Alex', ehDono: true } }),
    prisma.pessoa.create({ data: { nome: 'Ana' } }),
    prisma.pessoa.create({ data: { nome: 'Bruno' } }),
  ])

  const corrente = await prisma.conta.create({
    data: { nome: 'Conta corrente', tipo: 'CORRENTE', saldoInicial: reais(1200) },
  })
  const cartao = await prisma.conta.create({
    data: {
      nome: 'Cartão de crédito',
      tipo: 'CARTAO',
      diaFechamento: 15,
      diaVencimento: 22,
      limite: reais(8000),
    },
  })
  const poupanca = await prisma.conta.create({
    data: { nome: 'Reserva', tipo: 'POUPANCA', saldoInicial: reais(5000) },
  })

  const categorias = await Promise.all(
    [
      { nome: 'Salário', tipo: 'ENTRADA' as const, cor: '#00DD16' },
      { nome: 'Freelas', tipo: 'ENTRADA' as const, cor: '#009BDD' },
      { nome: 'Moradia', tipo: 'SAIDA' as const, cor: '#8A19D6' },
      { nome: 'Alimentação', tipo: 'SAIDA' as const, cor: '#FF7900' },
      { nome: 'Transporte', tipo: 'SAIDA' as const, cor: '#009BDD' },
      { nome: 'Saúde', tipo: 'SAIDA' as const, cor: '#00DD16' },
      { nome: 'Lazer', tipo: 'SAIDA' as const, cor: '#D619A8' },
      { nome: 'Educação', tipo: 'SAIDA' as const, cor: '#7314B3' },
    ].map((c) => prisma.categoria.create({ data: c })),
  )

  const cat = (nome: string) => categorias.find((c) => c.nome === nome)!.id

  // Recorrências: o esqueleto de todo mês.
  const inicioHistorico = `${somarMeses(mesAtual, -3)}-01`

  const recorrentes = await Promise.all([
    prisma.recorrencia.create({
      data: {
        descricao: 'Salário',
        valor: reais(6500),
        tipo: 'ENTRADA',
        diaDoMes: 5,
        dataInicio: inicioHistorico,
        contaId: corrente.id,
        categoriaId: cat('Salário'),
      },
    }),
    prisma.recorrencia.create({
      data: {
        descricao: 'Aluguel',
        valor: reais(1800),
        tipo: 'SAIDA',
        diaDoMes: 10,
        dataInicio: inicioHistorico,
        contaId: corrente.id,
        categoriaId: cat('Moradia'),
      },
    }),
    prisma.recorrencia.create({
      data: {
        descricao: 'Internet e energia',
        valor: reais(320),
        tipo: 'SAIDA',
        diaDoMes: 12,
        dataInicio: inicioHistorico,
        contaId: corrente.id,
        categoriaId: cat('Moradia'),
      },
    }),
    prisma.recorrencia.create({
      data: {
        descricao: 'Plano de saúde',
        valor: reais(410),
        tipo: 'SAIDA',
        diaDoMes: 8,
        dataInicio: inicioHistorico,
        contaId: corrente.id,
        categoriaId: cat('Saúde'),
      },
    }),
    prisma.recorrencia.create({
      data: {
        descricao: 'Streaming',
        valor: reais(55),
        tipo: 'SAIDA',
        diaDoMes: 20,
        dataInicio: inicioHistorico,
        contaId: cartao.id,
        categoriaId: cat('Lazer'),
      },
    }),
  ])

  for (const r of recorrentes) {
    await materializarRecorrencia(r.id, somarMeses(mesAtual, 6))
  }

  // Parcelamentos: um em andamento, um de terceiro, um recente.
  await criarParcelamento({
    descricao: 'Notebook',
    valorTotal: reais(4800),
    numeroParcelas: 12,
    dataInicio: `${somarMeses(mesAtual, -5)}-14`,
    contaId: cartao.id,
    categoriaId: cat('Educação'),
  })

  await criarParcelamento({
    descricao: 'Celular da Ana',
    valorTotal: reais(2400),
    numeroParcelas: 10,
    dataInicio: `${somarMeses(mesAtual, -3)}-08`,
    contaId: cartao.id,
    categoriaId: cat('Lazer'),
    pessoaId: ana.id,
  })

  await criarParcelamento({
    descricao: 'Bicicleta',
    valorTotal: reais(1500),
    numeroParcelas: 6,
    dataInicio: `${somarMeses(mesAtual, -1)}-20`,
    contaId: cartao.id,
    categoriaId: cat('Lazer'),
    pessoaId: bruno.id,
  })

  // Lançamentos avulsos dos últimos três meses — variedade sem exagero.
  const avulsos: [string, number, string, number][] = [
    ['Mercado', 620, 'Alimentação', -3],
    ['Restaurante', 180, 'Alimentação', -3],
    ['Combustível', 300, 'Transporte', -3],
    ['Mercado', 710, 'Alimentação', -2],
    ['Farmácia', 95, 'Saúde', -2],
    ['Combustível', 280, 'Transporte', -2],
    ['Cinema', 90, 'Lazer', -2],
    ['Mercado', 680, 'Alimentação', -1],
    ['Uber', 160, 'Transporte', -1],
    ['Curso online', 240, 'Educação', -1],
    ['Mercado', 540, 'Alimentação', 0],
    ['Combustível', 310, 'Transporte', 0],
  ]

  for (const [descricao, valor, categoria, deslocamento] of avulsos) {
    await criarLancamento({
      descricao,
      valor: reais(valor),
      tipo: 'SAIDA',
      data: `${somarMeses(mesAtual, deslocamento)}-18`,
      contaId: cartao.id,
      categoriaId: cat(categoria),
    })
  }

  await criarLancamento({
    descricao: 'Projeto freelance',
    valor: reais(1800),
    tipo: 'ENTRADA',
    data: `${somarMeses(mesAtual, -2)}-22`,
    contaId: corrente.id,
    categoriaId: cat('Freelas'),
  })

  // Transferência para a reserva — aparece no extrato, some dos gastos.
  await criarTransferencia({
    data: `${somarMeses(mesAtual, -1)}-06`,
    valor: reais(800),
    contaOrigemId: corrente.id,
    contaDestinoId: poupanca.id,
  })

  // Ana já pagou parte do que deve.
  await prisma.pagamento.create({
    data: { pessoaId: ana.id, valor: reais(480), data: `${somarMeses(mesAtual, -1)}-15` },
  })

  const total = await prisma.lancamento.count()
  console.log(`seed concluído: ${total} lançamentos, 3 contas, 3 pessoas, 8 categorias`)
}

main()
  .catch((e) => {
    console.error('seed falhou:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
