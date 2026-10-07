<div align="center">

# Caixa

**Controle financeiro pessoal self-hosted.**
Você sobe a sua instância, seus dados ficam no seu banco, ninguém mais tem acesso.

![Next.js 16](https://img.shields.io/badge/Next.js-16-000?style=flat-square&logo=nextdotjs)
![React 19](https://img.shields.io/badge/React-19-087EA4?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma 7](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white)
![85 testes](https://img.shields.io/badge/testes-85%20passando-00DD16?style=flat-square)
![MIT](https://img.shields.io/badge/licença-MIT-8A19D6?style=flat-square)

![Painel do Caixa](docs/capturas/painel-desktop-claro.png)

</div>

---

## O problema

O aplicativo do banco mostra o que **já aconteceu**. A planilha mostra o que você
**lembrou de digitar**. Nenhum dos dois responde a pergunta que importa no fim do
mês:

> O salário cai no dia 5, o aluguel sai no 10, a fatura vence no 22.
> **Em que dia o saldo fica negativo — e por quanto?**

E quando outras pessoas usam o seu cartão, aparece uma segunda pergunta que
quase nenhum app responde: **quanto da fatura é gasto seu e quanto volta como
reembolso?**

O Caixa existe para responder essas duas.

## O que ele faz

| | |
|---|---|
| **Fluxo de caixa por data** | Linha do tempo do mês com saldo acumulado — aponta o dia exato em que o saldo vira negativo |
| **Reembolsos de terceiros** | Lançamento no nome de outra pessoa vira "a receber", com saldo por pessoa e registro de pagamentos |
| **Cartão de crédito de verdade** | Dia de fechamento e de vencimento: compra depois do fechamento cai na fatura seguinte, como no banco |
| **Parcelamentos** | Informe valor e número de parcelas; quantas já venceram é derivado da data de início |
| **Recorrências** | Salário, aluguel e assinaturas geram os lançamentos previstos sozinhos |
| **Contas com saldo real** | Corrente, poupança, dinheiro e cartão, com transferência entre elas |
| **Antecipações** | Crédito contratado para cobrir obrigação, com taxa efetiva derivada e custo acumulado visível |
| **Relatórios** | Gastos por categoria, comparação mês a mês e evolução do saldo separando fato de projeção |

## Telas

| Relatórios | Lançamentos |
|---|---|
| ![Relatórios](docs/capturas/relatorios-desktop-claro.png) | ![Lançamentos](docs/capturas/lancamentos-desktop-claro.png) |

| Modo escuro | No celular |
|---|---|
| ![Painel escuro](docs/capturas/painel-desktop-escuro.png) | ![Painel mobile](docs/capturas/painel-mobile-claro.png) |

Todas as capturas saem do seed de demonstração — nenhum dado real aparece aqui.

## Experimentar

Requer apenas Docker. Sobe banco e aplicação, aplica o schema e carrega os dados
de demonstração:

```bash
docker compose -f docker-compose.demo.yml up
```

Abra <http://localhost:3000> e entre com a senha `demo`. Leva cerca de um minuto
na primeira vez.

## Instalar

Requer Node 22+ e Docker.

```bash
cp .env.example .env    # defina SENHA_ACESSO
npm install
npm run db:up           # Postgres em container
npm run db:push         # cria as tabelas
npm run dev
```

Na primeira visita, uma tela pede o seu nome e a primeira conta; as categorias
comuns já vêm prontas. Para começar com dados fictícios em vez do zero, rode
`npm run db:seed` antes.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Suíte de testes |
| `npm run db:up` / `db:down` | Sobe / derruba o Postgres |
| `npm run db:seed` | Popula com um perfil fictício coerente |
| `npm run db:studio` | Interface web do banco |
| `npm run capturar` | Regera as capturas de tela |

### Hospedar

Funciona em qualquer plataforma que rode Next.js com um Postgres. Com pooler
(Supabase, Neon), use duas variáveis: `DATABASE_URL` apontando para o pooler em
*transaction mode*, usada em runtime, e `DIRECT_URL` para a conexão direta, usada
pelas migrations — o pooler em transaction mode não suporta os comandos que elas
emitem.

## Acesso

A instância é protegida por **senha única**, em `SENHA_ACESSO`. Não há cadastro
nem múltiplos usuários: quem tem a senha é o dono dos dados.

Sem a variável definida, a aplicação **não libera nenhuma tela** — exibe um aviso
de configuração pendente. Um sistema financeiro que abre sozinho porque faltou
configurar é pior que um que não sobe.

O cookie guarda um token assinado com HMAC derivado da própria senha, então
**trocar a senha encerra todas as sessões ativas** — exatamente o que se quer
quando a suspeita é de que alguém a descobriu.

## Por dentro

**Next.js 16** · **React 19** · **TypeScript 5.9** · **Prisma 7** · **Postgres** ·
**Tailwind 4** · **Vitest**

```
src/
  domain/    regras puras — sem Prisma, sem React, testadas em milissegundos
  server/    Prisma e casos de uso
  app/       telas (App Router)
```

A camada `domain/` não importa Prisma, React nem Next. Se um teste dela precisar
de banco ou de browser, a regra está na camada errada — é o que mantém a suíte
inteira rodando em menos de meio segundo.

## Decisões que não são óbvias

<details>
<summary><strong>Uma tabela de lançamentos, não quatro</strong></summary>

<br>

Receita, conta fixa, parcela e pagamento são todos "dinheiro que entra ou sai
numa data". Separá-los em tabelas faz *gastos por categoria* virar quatro
consultas e uma mesclagem em memória, e faz cada tipo novo tocar todo relatório
já escrito.

Unificados, a mesma pergunta é um `GROUP BY`. Parcelamento e recorrência existem
como **geradores** de lançamentos, não como tipos — o que preserva as regras de
calendário sem duplicá-las em cada consulta.

</details>

<details>
<summary><strong>Dinheiro é inteiro em centavos</strong></summary>

<br>

`0.1 + 0.2` em JavaScript dá `0.30000000000000004`. Nenhum float circula pelo
sistema; a conversão acontece uma vez, na borda de entrada.

Parcelas também somam exatamente o total: R$ 100 em 3× vira 33,34 + 33,33 +
33,33, com o resto na primeira. Dividir e arredondar perderia centavos a cada
compra.

</details>

<details>
<summary><strong>Datas são strings <code>YYYY-MM-DD</code>, nunca <code>Date</code></strong></summary>

<br>

`new Date('2026-08-15')` é meia-noite UTC e, lido em `America/Sao_Paulo`, vira
dia 14 — deslocando a compra para a fatura errada. Toda a aritmética é feita
sobre os componentes da string.

Pelo mesmo motivo, nenhuma função de domínio chama `new Date()` por conta
própria: "hoje" é sempre um parâmetro. Caso contrário a suíte passaria hoje e
falharia no dia 31.

</details>

<details>
<summary><strong>Saldo é derivado, não armazenado</strong></summary>

<br>

Saldo inicial mais lançamentos efetivados. Um número gravado desatualiza assim
que alguém corrige um lançamento antigo, e não há como saber que ele mentiu.

Pelo mesmo motivo, "quantas parcelas já venceram" é derivado da data de início:
um campo que o usuário precisa manter atualizado fica errado no dia em que ele
esquecer.

</details>

<details>
<summary><strong>Status nunca é inferido da data</strong></summary>

<br>

Uma fatura vencida não é uma fatura paga — pode ser exatamente a que está em
atraso. Os estados são `PREVISTO`, `EFETIVADO` e `ATRASADO`, e registram o que
aconteceu, não o que deveria ter acontecido.

</details>

<details>
<summary><strong>Transferência entre contas próprias não é despesa</strong></summary>

<br>

Ela vira um par de lançamentos ligados e sai dos relatórios de gasto. Incluí-la
inflaria todo relatório sem que ninguém percebesse de onde veio o excesso.

</details>

<details>
<summary><strong>Comparação de senha em tempo constante</strong></summary>

<br>

`===` vaza informação pelo tempo de resposta: strings que diferem no primeiro
caractere retornam mais rápido que as que diferem no último, o que permite
descobrir o valor caractere a caractere. A comparação percorre a string inteira
sempre.

</details>

<details>
<summary><strong>Gráficos em SVG, sem biblioteca</strong></summary>

<br>

Rosca, barras e linha somam poucas dezenas de linhas cada. Bibliotecas do ramo
pesam centenas de kilobytes para dar flexibilidade que três gráficos fixos não
usam. Cada um traz `role="img"` e descrição textual — gráfico sem alternativa
não existe para leitor de tela.

</details>

## Testes

85 testes em 12 arquivos, sem banco e sem browser, em menos de meio segundo:

```bash
npm test
```

A maioria defende **decisões**, não só o caminho feliz:

- a soma das parcelas é igual ao total, mesmo quando a divisão não é exata
- recorrência no dia 31 cai no último dia de fevereiro, inclusive em ano bissexto
- compra feita depois do fechamento entra na fatura do mês seguinte
- transferência não aparece em relatório de despesa
- token de sessão com expiração esticada é recusado
- período invertido no relatório é normalizado, não somado errado

## Design

A identidade visual foi replicada, como exercício de implementação, a partir de
arquivos públicos da comunidade no Figma:

- [projeto tela nubank (Community)](https://www.figma.com/design/Mwc5gzmCdaMn7TNoCpPyBM/projeto-tela-nubank--Community-)
- [Nubank web (Community)](https://www.figma.com/design/FqwVdlyUZ3It7aOKNzSMaq/Nubank-web--Community-)

Nenhuma marca registrada é usada: não há logo nem nome de instituição financeira
na aplicação.

## Ainda não existe

Importação de OFX/CSV, orçamento por categoria com limite, metas de economia,
multiusuário.

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md). A única regra estrutural é que
`src/domain/` não importa Prisma nem React.

## Licença

MIT — veja [LICENSE](LICENSE).
