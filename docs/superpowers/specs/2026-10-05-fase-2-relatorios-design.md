# Design: Fase 2 — Relatórios

**Data:** 2026-10-05
**Status:** aprovado
**Depende de:** Fase 1 (modelo unificado de lançamentos)

## Objetivo

Responder as perguntas que só aparecem com histórico: para onde o dinheiro está
indo, se este mês foi pior que o anterior, e se a situação melhora ou piora ao
longo do tempo.

É também a fase que mais rende visualmente num portfólio — um gráfico comunica
competência em dois segundos, enquanto uma tela de cadastro exige leitura.

## Os três relatórios

### 1. Para onde foi o dinheiro

Gastos por categoria num período, em rosca, com tabela ao lado mostrando valor e
percentual. Clicar numa categoria abre o extrato filtrado por ela.

Exclui transferências entre contas próprias: mover dinheiro não é gasto, e
incluí-las infla o total sem que a pessoa perceba por quê.

Exclui, por padrão, lançamentos de terceiros — o que a mãe gastou no seu cartão
não é consumo seu. Um controle alterna entre "meus gastos" e "tudo que passou no
cartão", porque as duas perguntas são legítimas em momentos diferentes.

### 2. Mês a mês

Barras comparando entradas e saídas dos últimos 12 meses, com linha de saldo
acumulado sobreposta. Revela sazonalidade — IPVA em janeiro, seguro em março — que
um mês isolado esconde.

### 3. Evolução do saldo

Linha com a soma dos saldos de todas as contas ao longo do tempo, separando o que
é fato (lançamentos efetivados) do que é projeção (previstos). A distinção é
visual, não só de legenda: projeção em traço interrompido.

Um gráfico que mistura fato e previsão na mesma linha contínua induz a decidir com
base em suposição acreditando que é histórico.

## Decisões

**1. Agregação no banco, não em memória.** `GROUP BY` com `SUM` em vez de
carregar lançamentos e somar em JavaScript. É o retorno direto da unificação feita
na Fase 1 — com quatro tabelas, isso exigiria quatro consultas e merge manual.

**2. Gráficos renderizados no servidor onde possível.** Barras e rosca são SVG
gerado em server component; só a interação (hover, clique para filtrar) é cliente.
Evita enviar a série inteira ao navegador e mantém a página útil sem JavaScript.

**3. Sem biblioteca de gráficos.** Rosca, barras e linha em SVG puro são algumas
dezenas de linhas cada, e as bibliotecas do ramo pesam centenas de kilobytes
para dar flexibilidade que três gráficos fixos não usam. A decisão se inverte no
dia em que houver gráficos arbitrários definidos pelo usuário.

**4. Período como estado de URL.** `?de=2026-01&ate=2026-12` em vez de estado
interno, pela mesma razão dos filtros da Fase 1: a visão fica compartilhável,
recarregável e navegável pelo botão voltar.

## Arquitetura

```
src/domain/relatorios.ts     agregações puras, testáveis sem banco
src/server/relatorios.ts     consultas agregadas via Prisma
src/components/graficos/     Rosca.tsx, Barras.tsx, Linha.tsx — SVG puro
src/app/relatorios/          a tela
```

O domínio recebe linhas já agregadas e cuida de percentuais, ordenação,
agrupamento de cauda longa ("outros" quando passa de N categorias) e montagem das
séries. O servidor só traduz Prisma → domínio.

## Acessibilidade

Gráfico é imagem: sem alternativa textual, não existe para leitor de tela. Cada um
traz `role="img"` com `aria-label` descrevendo os dados, e a tabela ao lado da
rosca não é redundância — é a versão acessível do mesmo conteúdo, útil também para
quem prefere número a desenho.

Cor nunca é o único portador de significado: as fatias têm rótulo, e as séries da
linha se distinguem por traço além da cor.

## Testes

- percentuais somando 100 mesmo com arredondamento
- transferências excluídas do total de gastos
- agrupamento de cauda longa em "outros"
- série mensal preenchendo meses sem lançamento com zero, não com buraco
- separação entre efetivado e previsto na série de evolução

## Fora de escopo

Exportação para PDF ou planilha, relatórios configuráveis pelo usuário,
comparação com médias externas, previsão por tendência.
