# Contribuindo

## Ambiente

```bash
npm install
npm run db:up
npm run db:push
npm run db:seed
npm run dev
```

## Antes de abrir um PR

```bash
npm test              # toda a suíte
npx tsc --noEmit      # tipos
npm run build         # build de produção
```

## A regra que mantém a arquitetura viva

**`src/domain/` não importa Prisma, React nem Next.**

Essa é a única regra estrutural do projeto, e ela é o que torna as regras de
negócio testáveis em milissegundos, sem banco e sem browser. Um `import` de
Prisma dentro de `domain/` quebra isso em silêncio: os testes continuam
passando, mas passam a exigir infraestrutura, e a partir daí ninguém mais roda a
suíte inteira antes de commitar.

Se uma regra precisa de dados do banco, a solução é **receber os dados como
parâmetro**, não buscá-los. Veja `domain/saldos.ts` — ela calcula saldo sem
saber que Prisma existe.

## Convenções

- **Dinheiro:** inteiro em centavos. A conversão acontece uma vez, na borda de
  entrada (server action), nunca no meio do domínio
- **Datas:** strings `YYYY-MM-DD` e competências `YYYY-MM`. Não use `Date` para
  datas de negócio — fuso horário desloca o dia
- **Transações:** nada de `$transaction(async tx => ...)`. Transações interativas
  são incompatíveis com pooler em transaction mode, usado por qualquer deploy
  serverless. Use `create` aninhado
- **Status:** nunca inferido da data. Se precisa saber se algo foi pago, leia o
  campo, não o calendário

## Testes

Cada regra de domínio tem teste. Prefira casos que defendam a **decisão**, não
só o caminho feliz: o teste que mais vale em `domain/saldos.ts` é o que garante
que a soma das parcelas é igual ao total, porque é o que quebra se alguém
"simplificar" a divisão.

## Interface

Alterou layout? **Regere as capturas** em `docs/capturas/` e atualize o README.
Um projeto cuja primeira imagem não corresponde à tela perde credibilidade de
imediato.

Antes de abrir o PR, confira em 390px e 1280px, navegue com `Tab` para ver se o
foco está visível, e verifique se os formulários têm rótulo.
