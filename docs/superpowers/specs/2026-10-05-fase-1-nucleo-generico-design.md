# Design: Fase 1 — Núcleo genérico

**Data:** 2026-10-05
**Status:** aprovado

## Contexto

O Caixa nasceu de um sistema sob medida: um dono, um cartão, um conjunto fixo
de necessidades. As regras que ele resolve são boas e estão testadas — competência
de fatura a partir do dia de fechamento, geração de parcelas derivada da data de
início, saldo por pessoa, linha do tempo de caixa. O que falta é o que todo app
de finanças tem e ele não tinha: **categorias, contas com saldo e lançamentos
avulsos**.

Esta fase generaliza o modelo sem perder nenhuma regra.

## Objetivo

Um controle financeiro pessoal self-hosted onde qualquer pessoa registre o que
entra e o que sai, categorizado, em várias contas, incluindo compras parceladas
no cartão e valores a receber de terceiros.

Cada pessoa sobe a própria instância. Não há multiusuário: um dono por banco.

## Decisão central: uma tabela de lançamentos

Hoje existem quatro tabelas representando a mesma coisa por caminhos diferentes:
`Receita`, `ContaFixa`, `Parcela` e `Pagamento`. Todas são "dinheiro que entra ou
sai numa data".

Isso bastava quando o sistema respondia uma pergunta. Com categorias e relatórios,
vira obstáculo: *"gastos por categoria em outubro"* exigiria unir quatro consultas
e mesclar em memória, e cada tipo novo de lançamento tocaria todo relatório já
escrito.

**Unificamos em `Lancamento`.** A mesma pergunta vira `GROUP BY categoria`, e
adicionar um tipo novo passa a ser uma coluna, não uma tabela.

Recorrência e parcelamento continuam existindo, mas como **geradores** de
lançamentos — não como tipos. É o que preserva `gerarParcelas` e
`competenciaDaCompra` sem reescrevê-las.

## Modelo de domínio

| Entidade | Campos |
|---|---|
| **Conta** | nome, tipo (`CORRENTE`/`POUPANCA`/`DINHEIRO`/`CARTAO`/`INVESTIMENTO`), saldoInicial, ativa; cartão acrescenta diaFechamento, diaVencimento, limite |
| **Categoria** | nome, tipo (`ENTRADA`/`SAIDA`), cor, categoriaPaiId (opcional), ativa |
| **Pessoa** | nome, ehDono, ativa |
| **Lancamento** | descrição, valor, data, competência, tipo (`ENTRADA`/`SAIDA`), status (`PREVISTO`/`EFETIVADO`/`ATRASADO`), contaId, categoriaId, pessoaId, parcelamentoId, recorrenciaId, transferenciaId, numeroParcela, totalParcelas |
| **Parcelamento** | descrição, valorParcela, numeroParcelas, dataInicio, contaId, categoriaId, pessoaId |
| **Recorrencia** | descrição, valor, tipo, diaDoMes, contaId, categoriaId, dataInicio, dataFim (opcional), ativa |
| **Transferencia** | data, valor, contaOrigemId, contaDestinoId |
| **Antecipacao** | data, valorBruto, valorLiquido, contaId, parcelamentoId |

### Decisões

**1. Valor sempre positivo; a direção vem de `tipo`.** Mesma razão pela qual o
importador derivava o sinal de `DEBIT`/`CREDIT` e não do sinal do número:
convenções de sinal divergem entre origens, e `tipo` é explícito.

**2. Saldo de conta é derivado, não armazenado.** `saldoInicial` + soma dos
lançamentos efetivados. Um saldo gravado desatualiza assim que alguém corrige um
lançamento antigo; um derivado não tem como mentir. O custo é uma agregação por
consulta, irrelevante na escala de um usuário.

**3. Lançamentos são materializados pelos geradores.** Um parcelamento de 10×
cria 10 linhas na hora do cadastro; uma recorrência cria lançamentos previstos
para os próximos 12 meses e repõe conforme o tempo passa. O motivo é o mesmo da
decisão original sobre parcelas: só assim dá para editar, quitar ou estornar uma
ocorrência isolada.

**4. Transferência é um par de lançamentos ligados.** Uma saída na conta de
origem e uma entrada no destino, ambas apontando para a mesma `Transferencia`.
Isso mantém o extrato de cada conta completo e faz o par sumir naturalmente dos
relatórios de gasto — transferir dinheiro entre contas próprias não é despesa, e
tratar como tal inflaria todo relatório.

**5. `status` nunca é inferido da data.** Herdado do sistema original e mantido:
um lançamento vencido não é um lançamento pago. `ATRASADO` só é atingido a partir
de `PREVISTO`, e sempre por ação explícita ou rotina de manutenção — nunca pela
leitura da tela.

**6. Categorias têm um nível de hierarquia.** "Alimentação › Mercado" cobre o uso
real sem exigir árvore recursiva. Profundidade arbitrária complica consulta,
interface e relatório para um ganho que pessoa física raramente usa.

## Regras de negócio

### Competência de um lançamento

Para contas comuns, competência é o mês da data. Para cartão, aplica-se a regra
já testada em `domain/fatura.ts`: compra em dia maior que o fechamento cai na
fatura do mês seguinte.

### Saldo e projeção

```
saldo atual   = saldoInicial + Σ(lançamentos EFETIVADOS até hoje)
saldo previsto = saldo atual + Σ(lançamentos PREVISTOS até a data alvo)
```

A linha do tempo (`domain/fluxo.ts`) passa a receber lançamentos em vez de
eventos montados à mão, mas a função não muda.

### Valores a receber

Lançamento com `pessoaId` diferente do dono é valor reembolsável. O saldo de cada
pessoa é a soma dos não quitados menos os pagamentos recebidos — regra preservada
de `domain/pessoas.ts`.

### Antecipação

Generalização da "rolagem de fatura": registra-se quanto foi contratado
(`valorBruto`) e quanto foi recebido (`valorLiquido`); a taxa é derivada, nunca
configurada. Gera um parcelamento correspondente, porque o dinheiro recebido vira
dívida futura — registrar só a entrada mostraria um mês saudável enquanto a
obrigação seguinte cresce.

## Arquitetura

Preservada do projeto original:

```
src/
  domain/    regras puras — sem Prisma, sem React, testadas em milissegundos
  server/    Prisma e casos de uso
  app/       telas (Next.js App Router)
```

Módulos de domínio migrados sem alteração: `dinheiro`, `fatura`, `parcelamento`,
`fluxo`, `pessoas`. Renomeado: `rolagem` → `antecipacao`. Novos: `categorias`
(agregação), `saldos` (derivação e projeção), `recorrencia` (geração).

## Telas

1. **Painel** — saldo consolidado, linha do tempo do mês, composição por categoria
   e por pessoa, alerta de saldo negativo
2. **Lançamentos** — extrato filtrável por conta, categoria, pessoa, período e
   status; criação de lançamento avulso
3. **Contas** — lista com saldo de cada uma, transferência entre contas
4. **Pessoas** — quanto cada uma deve, registro de pagamento recebido
5. **Cadastros** — categorias, recorrências, parcelamentos, antecipações

## Migração

O projeto é novo; não há base legada a converter. O schema nasce no formato final.
Para quem vinha do sistema anterior, o README documentará a equivalência:
`Receita`/`ContaFixa` → `Recorrencia`, `Parcela` → `Lancamento` com
`parcelamentoId`, `Fonte` → `Conta`.

## Testes

Vitest sobre `domain/`, sem banco e sem browser. Os 33 testes migrados continuam
válidos. Novos:

- saldo derivado com lançamentos previstos e efetivados misturados
- transferência não aparece em relatório de despesa
- competência de lançamento em cartão nos limites do fechamento
- recorrência gerando ocorrências e respeitando `dataFim`
- agregação por categoria ignorando transferências

## Fora de escopo

Importação de OFX/CSV, multiusuário, orçamento por categoria com limite, metas de
economia, aplicativo nativo. Relatórios ficam na Fase 2; empacotamento público na
Fase 3.

## Riscos

- **Volume de lançamentos materializados.** Uma recorrência de 12 meses mais
  parcelamentos longos geram centenas de linhas por ano. Irrelevante para um
  usuário, mas exige índice em `(competencia, contaId)` desde o início.
- **Complexidade da tela de lançamentos.** Filtro por cinco dimensões é onde esse
  tipo de produto costuma ficar confuso. Mitigação: filtros como estado de URL,
  o que também torna cada visão compartilhável e recarregável.
