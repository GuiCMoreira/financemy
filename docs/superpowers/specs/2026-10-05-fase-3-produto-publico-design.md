# Design: Fase 3 — Produto público

**Data:** 2026-10-05
**Status:** aprovado
**Depende de:** Fases 1 e 2

## Objetivo

Transformar código que funciona em projeto que alguém consegue usar — e que serve
como peça de portfólio.

Esta é a fase que parece a menos importante e decide se o projeto tem valor. Um
repositório que não roda em cinco minutos não é avaliado por recrutador nem
adotado por usuário: ambos desistem na primeira fricção.

## Critério de aceite

Uma pessoa que nunca viu o projeto consegue, **em até cinco minutos**, ter o
sistema rodando com dados de demonstração, partindo apenas do README.

Isso é verificável: executar os comandos do README numa pasta limpa, cronometrando.

## Entregas

### README que responde na ordem certa

1. **O que é** — uma frase, e uma captura de tela logo abaixo
2. **O que resolve** — as perguntas que o sistema responde, não a lista de recursos
3. **Como rodar** — três comandos, sem pré-requisito escondido
4. **Como é por dentro** — a arquitetura em um diagrama e um parágrafo
5. **Decisões que não são óbvias** — a seção que diferencia portfólio de tutorial

A seção de decisões é a mais valiosa para quem avalia: mostra raciocínio, não
apenas execução. Entram centavos em inteiro, datas como string, status nunca
inferido da data, tabela única de lançamentos, saldo derivado.

### Subir com um comando

```bash
docker compose up
```

Sobe banco e aplicação juntos, com o schema aplicado e o seed de demonstração
carregado. Sem passo manual de migração: se a pessoa precisa rodar três comandos
na ordem certa antes de ver qualquer coisa, metade desiste.

O modo de desenvolvimento continua separado, com banco em container e aplicação
local.

### Seed de demonstração

Um perfil fictício coerente: salário, aluguel, contas fixas, cartão com fechamento
e vencimento, compras parceladas em andamento, duas pessoas devendo, categorias
preenchidas e três meses de histórico.

Coerente importa mais do que volume. Dados aleatórios produzem gráficos sem
sentido — gasto de mercado maior que o salário, categorias sem relação com o
histórico — e o visitante conclui que o sistema está errado, não que os dados são
falsos.

### Capturas de tela

Painel, lançamentos e relatórios, em claro e escuro, geradas a partir do seed de
demonstração. No README ficam três; as demais em `docs/capturas/`.

### Licença e créditos

MIT. Créditos do design no README: a identidade visual foi replicada de arquivos
públicos da comunidade no Figma, com link para as fontes, como exercício de
implementação. A aplicação não usa logo nem nome de marca alguma.

### Documentação de contribuição

`CONTRIBUTING.md` com setup de desenvolvimento, como rodar os testes e a regra
que mantém a arquitetura viva: **`domain/` não importa Prisma nem React**. Sem
isso escrito, a primeira contribuição externa coloca uma consulta ao banco dentro
de uma função de domínio e a separação se perde.

## Qualidade antes de publicar

| Item | Critério |
|---|---|
| Testes | Toda a suíte passa; `domain/` com cobertura das regras |
| Tipos | `tsc --noEmit` limpo |
| Acessibilidade | Navegação por teclado completa, foco visível, formulários rotulados |
| Responsivo | Verificado em 390px e 1280px |
| Dados pessoais | Nenhum nome, foto ou valor real em código, seed ou histórico |
| Segredos | `.env` ignorado, nenhum segredo no histórico |

A linha de dados pessoais é a razão de este projeto nascer em repositório novo: no
anterior, foto e dados reais estão no histórico, e removê-los num commit posterior
não os apaga.

## Fora de escopo

Publicação em registro de pacotes, CI/CD além de rodar os testes no push, site de
documentação, internacionalização, template de deploy em um clique.

## Risco

**Capturas desatualizam.** Mudanças de interface tornam o README mentiroso, e um
projeto cuja primeira imagem não corresponde à tela perde credibilidade de
imediato. Mitigação: regerar as capturas faz parte de qualquer tarefa que altere
layout — registrado no `CONTRIBUTING.md`.
