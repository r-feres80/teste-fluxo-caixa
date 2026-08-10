// Configuração central. Nenhum segredo, token ou credencial deve viver aqui
// ou em qualquer outro arquivo deste projeto.

export const APP_NAME = "CFO Finance Intelligence";
export const APP_TAGLINE = "Controle de Caixa • AP/AR • FP&A • Dados";
export const APP_DISCLAIMER = "Projeto demonstrativo de gestão financeira gerencial • Dados 100% fictícios";

export const STORAGE_KEY = "cfo-fi-v2-state";

export const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ---- Picklists do Plano de Contas (orientam DRE e DFC, construídos nas próximas fases) ----

export const TIPO_CONTA = ["Sintética", "Analítica"];

export const NATUREZA_CONTA = ["Devedora", "Credora"];

export const ENTRADA_SAIDA = ["Entrada", "Saída"];

export const CLASSIFICACAO_DRE = [
  "Receita Bruta",
  "Deduções",
  "Custos",
  "Despesas com Pessoal",
  "Despesas Administrativas",
  "Despesas Comerciais",
  "Outras Despesas Operacionais",
  "Receitas Financeiras",
  "Despesas Financeiras",
  "Impostos sobre o Lucro", // IRPJ/CSLL — não Deduções (que é só ICMS ST/PIS/COFINS/ISS)
  "Fora do DRE",
];

export const CLASSIFICACAO_DFC = ["Operacional", "Investimento", "Financiamento", "Fora do DFC"];

// Subgrupo: novo nível entre Grupo (Classificação DFC) e Conta Gerencial.
// Cada subgrupo pertence a exatamente um Grupo DFC — a UI só oferece os
// subgrupos válidos para o grupo já selecionado na conta.
export const SUBGRUPOS_POR_GRUPO_DFC = {
  Operacional: [
    "Entradas", "Saídas Diretas", "Pessoal", "Benefícios", "Impostos de Folha",
    "Impostos", "Terceiros e Consultorias", "Marketing e Publicidade",
    "Real Estate e Facilities", "Outros Operacionais",
  ],
  Investimento: ["Investimentos"],
  Financiamento: ["Captações", "Receitas Financeiras"],
  "Fora do DFC": [],
};

// ---- Situações de lançamento (usadas a partir da Fase 2) ----

export const SITUACOES_LANCAMENTO = ["Previsto", "Em aberto", "Realizado", "Vencido", "Cancelado"];

// ---- Região do Cliente (usada em Contas a Receber) ----

export const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

// ---- Filtros globais: tipos de período ----

export const TIPOS_PERIODO = [
  { id: "mes", label: "Mês" },
  { id: "ytd", label: "Acumulado no ano" },
  { id: "anoCompleto", label: "Ano Completo" },
  { id: "ultimos12meses", label: "Últimos 12 meses" },
];

// PDD (Provisão para Devedores Duvidosos): percentual de provisão aplicado ao
// saldo vencido de Contas a Receber, por faixa de dias de atraso em relação à
// Data de Referência. Editável em Governança (parametros.pddFaixas) — nunca
// hardcoded no cálculo (ver calcularPDD em aging.js).
export const PDD_FAIXAS_PADRAO = [
  { key: "f1a30", label: "1-30", max: 30, pct: 0 },
  { key: "f31a60", label: "31-60", max: 60, pct: 5 },
  { key: "f61a90", label: "61-90", max: 90, pct: 10 },
  { key: "f91a120", label: "91-120", max: 120, pct: 25 },
  { key: "f121a180", label: "121-180", max: 180, pct: 50 },
  { key: "f180mais", label: "180+", max: 999999, pct: 100 }, // não usar Infinity: persiste em localStorage via JSON, que serializa Infinity como null
];

export const DEFAULT_PARAMETROS = {
  caixaMinimo: null,
  materialidadeValor: 20000,
  materialidadePct: 15,
  diasParaAlertas: 7,
  limiteConcentracaoPct: 40,
  pddFaixas: PDD_FAIXAS_PADRAO,
};
