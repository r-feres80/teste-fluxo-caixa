# Esqueleto Financeiro — Sistema Financeiro Auxiliar com IA

Este documento é a fonte única da estrutura de dados do produto. Toda entidade aqui já
existe no motor financeiro implementado (`cfo-fi-v2`) — este esqueleto não cria conceito
novo, ele **formaliza** o que já roda no código, para servir de referência tanto para o
template de CSV (Fase 1) quanto para o mapeamento futuro de API (Fase 2).

---

## 1. Entidades mínimas

| Entidade | Papel |
|---|---|
| `Empresas` | Unidade organizacional — permite consolidação multi-empresa |
| `PlanoDeContas` | Estrutura canônica de classificação financeira (o "de-para" de tudo) |
| `ContasBancárias` | Origem do saldo de caixa |
| `CentrosDeCusto` | Segmentação de despesa |
| `Clientes` | Parceiro de Contas a Receber |
| `Fornecedores` | Parceiro de Contas a Pagar |
| `Lançamentos` | Fato financeiro — toda entrada/saída passa por aqui |
| `OrçamentoItens` | Meta fixa por conta/período (Orçado — Planejamento) |

---

## 2. Campos por entidade

### PlanoDeContas
| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `id` | texto | sim | |
| `descricao` | texto | sim | Nome da conta |
| `tipo` | enum | sim | `Sintética` (agrupador) ou `Analítica` (recebe lançamento) |
| `contaPaiId` | texto | não | Hierarquia |
| `classificacaoDRE` | enum | sim (se Analítica) | Receita / Custo / Despesa / etc. |
| `classificacaoDFC` | enum | sim (se Analítica) | Operacional / Investimento / Financiamento |
| `aceitaOrcamento` | booleano | sim | Se essa conta pode ter meta (Orçado) |

**Isto é o modelo canônico** — toda origem (CSV, manual, futura API) precisa mapear sua própria conta para um `id` deste plano.

### Lançamentos (o fato financeiro)
| Campo | Tipo | Obrigatório | Alimenta qual indicador |
|---|---|---|---|
| `id` | texto | sim | — |
| `empresaId` | texto | sim | Filtro/consolidação |
| `tipo` | enum (`Entrada`/`Saída`) | sim | Todos |
| `valor` | número | sim | Todos |
| `contaGerencialId` | texto (→ PlanoDeContas) | sim | DRE, DFC, Maior gasto por categoria |
| `centroCustoId` | texto (→ CentrosDeCusto) | não | Maior gasto por categoria |
| `clienteFornecedorId` | texto (→ Clientes/Fornecedores) | não | A Receber / A Pagar, concentração |
| `dataVencimento` | data | sim | A Receber / A Pagar (o que vence) |
| `dataPagamento` | data | não (preenche quando realizado) | Caixa disponível, Entrou x Saiu |
| `competencia` | data (ano-mês) | sim | Resultado do mês (DRE) |
| `situacao` | enum (`Previsto`/`Realizado`) | sim | Real x Previsto |
| `transferencia` | booleano | sim | Exclui de DRE/DFC (movimento entre contas próprias) |

### ContasBancárias
| Campo | Tipo | Obrigatório |
|---|---|---|
| `id`, `empresaId`, `nome`, `saldoInicial`, `dataSaldoInicial`, `ativo` | — | sim |

### OrçamentoItens (Orçado — camada de Planejamento)
| Campo | Tipo | Obrigatório |
|---|---|---|
| `contaGerencialId` | texto | sim |
| `empresaId` | texto | não (branco = todas) |
| `ano`, `mes` | número | sim |
| `valor` | número | sim |

> O **Previsto** (Curto Prazo) não é uma entidade própria — é **calculado**, não cadastrado: Realizado até hoje + Lançamentos com `situacao = Previsto` e `dataVencimento` dentro do horizonte. Ajuste manual do gestor, quando existir, é um `Lançamento` com uma flag `ajusteManual: true`, nunca uma edição direta do número calculado.

---

## 3. De onde vem cada um dos 9 indicadores do dono

| # | Indicador | Fonte (entidades + campos) |
|---|---|---|
| 1 | Caixa disponível hoje | `ContasBancárias.saldoInicial` + soma de `Lançamentos` com `dataPagamento` preenchida |
| 2 | Caixa projetado (30 dias) | Indicador 1 + `Lançamentos` com `situacao=Previsto` e `dataVencimento` ≤ hoje+30 |
| 3 | Entrou x Saiu no mês | `Lançamentos.valor` agrupado por `tipo`, filtrado por `dataPagamento` no mês, `transferencia=false` |
| 4 | A Receber (total + atraso) | `Lançamentos` tipo Entrada, sem `dataPagamento`, agrupado por `clienteFornecedorId`; atraso = `dataVencimento` < hoje |
| 5 | A Pagar (total + vencimento próximo) | Mesma lógica, tipo Saída |
| 6 | Resultado do mês | `Lançamentos` por `competencia` + `PlanoDeContas.classificacaoDRE`, `situacao=Realizado` |
| 7 | Maior gasto por categoria | `Lançamentos` tipo Saída agrupado por `centroCustoId` ou `contaGerencialId` |
| 8 | Alertas | Regras sobre os indicadores 1-7 (ex.: caixa projetado negativo, concentração de cliente/fornecedor) |
| 9 | Real x Previsto x Orçado | Real = indicador 6; Previsto = indicador 2 (mesma lógica, horizonte do período); Orçado = `OrçamentoItens` |

---

## 4. Template de CSV — Fase 1

Cada entidade acima vira **um arquivo CSV próprio**, com essas colunas mínimas (nomes de coluna sugeridos — o de-para na importação mapeia qualquer nome de origem para estes):

**`plano_de_contas.csv`**
```
id,descricao,tipo,conta_pai_id,classificacao_dre,classificacao_dfc,aceita_orcamento
```

**`lancamentos.csv`**
```
id,empresa_id,tipo,valor,conta_gerencial_id,centro_custo_id,cliente_fornecedor_id,data_vencimento,data_pagamento,competencia,situacao,transferencia
```

**`contas_bancarias.csv`**
```
id,empresa_id,nome,saldo_inicial,data_saldo_inicial,ativo
```

**`orcamento_itens.csv`**
```
conta_gerencial_id,empresa_id,ano,mes,valor
```

---

## 5. Regra de ouro para qualquer evolução futura

Nenhum indicador pode ser calculado a partir de um campo que não esteja listado aqui. Se um novo indicador precisar de um dado novo, o primeiro passo é **adicionar o campo neste esqueleto** — nunca calcular "por fora" direto na tela ou na IA. Isso é o que garante que Dashboard e Finance AI nunca mostrem números diferentes (skill `erp-business-rules`).
