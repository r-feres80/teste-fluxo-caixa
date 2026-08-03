// Dataset demonstrativo — 100% fictício, em português, moeda R$/pt-BR.
// Construído para exercitar toda a hierarquia de Plano de Contas e Centro
// de Custo desde a Fase 1. Lançamentos reais de movimento entram na Fase 2.

import { todayISO } from "../utils/dateUtils.js";

// DRE/DFC/Tesouraria/Fluxo de Caixa/Contas a Pagar/Receber são módulos de
// FATO: sempre o "hoje" real do dispositivo, nunca uma data fixa. Se os
// lançamentos demo tivessem competência/vencimento fixos em "2026-07", o
// dataset "expiraria" assim que o relógio real passasse de julho/2026 — os
// módulos de FATO passariam a mostrar tudo zerado, não por bug, mas porque
// nenhum lançamento cairia mais no mês corrente. Os 2 lançamentos abaixo
// (l19, l20) usam o mês REAL atual para nunca ficarem obsoletos.
const HOJE = todayISO();
const MES_ATUAL = HOJE.slice(0, 7);

export const demoEmpresas = [
  { id: "e1", nome: "Comércio ABC Ltda", cnpj: "12.345.678/0001-01", ativo: true },
  { id: "e2", nome: "Indústria XYZ S.A.", cnpj: "23.456.789/0001-02", ativo: true },
];

export const demoUnidades = [
  { id: "u1", empresaId: "e1", nome: "Matriz - São Paulo", ativo: true },
  { id: "u2", empresaId: "e1", nome: "Filial - Campinas", ativo: true },
  { id: "u3", empresaId: "e2", nome: "Matriz - Curitiba", ativo: true },
];

export const demoClientes = [
  { id: "c1", nome: "Mercado Central Ltda", documento: "12.345.678/0001-90", ativo: true },
  { id: "c2", nome: "Distribuidora Sul Comércio", documento: "23.456.789/0001-11", ativo: true },
  { id: "c3", nome: "Construtora Horizonte Ltda", documento: "34.567.890/0001-22", ativo: true },
  { id: "c4", nome: "Farmácia Vida Saudável", documento: "45.678.901/0001-33", ativo: true },
];

export const demoFornecedores = [
  { id: "f1", nome: "Fornecedor Atacadista Nacional", documento: "11.222.333/0001-44", ativo: true },
  { id: "f2", nome: "Transportadora Rápido Brasil", documento: "22.333.444/0001-55", ativo: true },
  { id: "f3", nome: "Gráfica Impressão Total", documento: "33.444.555/0001-66", ativo: true },
  { id: "f4", nome: "Escritório Contábil Confiança", documento: "44.555.666/0001-77", ativo: true },
];

export const demoBancos = [
  { id: "b1", nome: "Banco do Brasil", codigo: "001", ativo: true },
  { id: "b2", nome: "Itaú Unibanco", codigo: "341", ativo: true },
  { id: "b3", nome: "Bradesco", codigo: "237", ativo: true },
  { id: "b4", nome: "Caixa Econômica Federal", codigo: "104", ativo: true },
];

export const demoContasBancarias = [
  { id: "cb1", bancoId: "b2", empresaId: "e1", apelido: "Conta Movimento", agencia: "1234", numero: "56789-0", saldoInicial: 85000, semLiquidez: "false", ativo: true },
  { id: "cb2", bancoId: "b1", empresaId: "e1", apelido: "Conta Movimento", agencia: "5678", numero: "12345-6", saldoInicial: 42000, semLiquidez: "false", ativo: true },
  { id: "cb3", bancoId: "b2", empresaId: "e1", apelido: "Aplicação CDB", agencia: "1234", numero: "99887-1", saldoInicial: 150000, semLiquidez: "true", ativo: true },
  { id: "cb4", bancoId: "b3", empresaId: "e2", apelido: "Conta Movimento", agencia: "4321", numero: "65432-1", saldoInicial: 60000, semLiquidez: "false", ativo: true },
];

export const demoProjetos = [
  { id: "p1", empresaId: "e1", nome: "Expansão Filial Campinas", ativo: true },
  { id: "p2", empresaId: "e2", nome: "Modernização de Sistemas", ativo: true },
];

// ---- Plano de Contas Gerencial (hierárquico) ----
// tipo: Sintética (agrupadora, não recebe lançamento) | Analítica (recebe lançamento)

export const demoPlanoDeContas = [
  { id: "pc1", codigo: "1", descricao: "RECEITAS", contaPaiId: null, tipo: "Sintética", natureza: "Credora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Entrada", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc1.01", codigo: "1.01", descricao: "Receita Operacional", contaPaiId: "pc1", tipo: "Sintética", natureza: "Credora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Entrada", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc1.01.01", codigo: "1.01.01", descricao: "Venda de Produtos", contaPaiId: "pc1.01", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Receita Bruta", classificacaoDFC: "Operacional", subgrupoDFC: "Entradas", entradaSaida: "Entrada", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc1.01.02", codigo: "1.01.02", descricao: "Prestação de Serviços", contaPaiId: "pc1.01", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Receita Bruta", classificacaoDFC: "Operacional", subgrupoDFC: "Entradas", entradaSaida: "Entrada", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc1.02", codigo: "1.02", descricao: "Deduções", contaPaiId: "pc1", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc1.02.01", codigo: "1.02.01", descricao: "Impostos sobre Vendas", contaPaiId: "pc1.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Deduções", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },

  { id: "pc2", codigo: "2", descricao: "CUSTOS", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc2.01", codigo: "2.01", descricao: "Custos Operacionais", contaPaiId: "pc2", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc2.01.01", codigo: "2.01.01", descricao: "Matéria-Prima", contaPaiId: "pc2.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Custos", classificacaoDFC: "Operacional", subgrupoDFC: "Saídas Diretas", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc2.01.02", codigo: "2.01.02", descricao: "Mercadorias", contaPaiId: "pc2.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Custos", classificacaoDFC: "Operacional", subgrupoDFC: "Saídas Diretas", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc2.01.03", codigo: "2.01.03", descricao: "Fretes", contaPaiId: "pc2.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Custos", classificacaoDFC: "Operacional", subgrupoDFC: "Saídas Diretas", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },

  { id: "pc3", codigo: "3", descricao: "DESPESAS OPERACIONAIS", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc3.01", codigo: "3.01", descricao: "Pessoal", contaPaiId: "pc3", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc3.01.01", codigo: "3.01.01", descricao: "Salários", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Pessoal", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.02", codigo: "3.01.02", descricao: "Encargos", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos de Folha", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.03", codigo: "3.01.03", descricao: "Benefícios", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Benefícios", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02", codigo: "3.02", descricao: "Administrativas", contaPaiId: "pc3", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc3.02.01", codigo: "3.02.01", descricao: "Aluguel", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Real Estate e Facilities", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02.02", codigo: "3.02.02", descricao: "Energia Elétrica", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Real Estate e Facilities", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02.03", codigo: "3.02.03", descricao: "Sistemas", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Outros Operacionais", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.03", codigo: "3.03", descricao: "Comercial", contaPaiId: "pc3", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc3.03.01", codigo: "3.03.01", descricao: "Marketing e Publicidade", contaPaiId: "pc3.03", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Comerciais", classificacaoDFC: "Operacional", subgrupoDFC: "Marketing e Publicidade", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.03.02", codigo: "3.03.02", descricao: "Comissões sobre Vendas", contaPaiId: "pc3.03", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Comerciais", classificacaoDFC: "Operacional", subgrupoDFC: "Outros Operacionais", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.04", codigo: "3.04", descricao: "Despesas Diversas", contaPaiId: "pc3", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Outras Despesas Operacionais", classificacaoDFC: "Operacional", subgrupoDFC: "Outros Operacionais", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },

  { id: "pc4", codigo: "4", descricao: "RESULTADO FINANCEIRO", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc4.01", codigo: "4.01", descricao: "Receitas Financeiras", contaPaiId: "pc4", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Receitas Financeiras", classificacaoDFC: "Financiamento", subgrupoDFC: "Receitas Financeiras", entradaSaida: "Entrada", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },
  { id: "pc4.02", codigo: "4.02", descricao: "Juros", contaPaiId: "pc4", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Financeiras", classificacaoDFC: "Financiamento", subgrupoDFC: "Captações", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },
  { id: "pc4.03", codigo: "4.03", descricao: "Tarifas Bancárias", contaPaiId: "pc4", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Financeiras", classificacaoDFC: "Financiamento", subgrupoDFC: "Captações", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },

  { id: "pc5", codigo: "5", descricao: "INVESTIMENTOS", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc5.01", codigo: "5.01", descricao: "Máquinas e Equipamentos", contaPaiId: "pc5", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Investimento", subgrupoDFC: "Investimentos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc5.02", codigo: "5.02", descricao: "Tecnologia", contaPaiId: "pc5", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Investimento", subgrupoDFC: "Investimentos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc5.03", codigo: "5.03", descricao: "Veículos", contaPaiId: "pc5", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Investimento", subgrupoDFC: "Investimentos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },

  { id: "pc6", codigo: "6", descricao: "IMPOSTOS SOBRE O LUCRO", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc6.01", codigo: "6.01", descricao: "IRPJ e CSLL", contaPaiId: "pc6", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Impostos sobre o Lucro", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },
];

// ---- Centros de Custo (hierárquico) ----

export const demoCentrosCusto = [
  { id: "cc1000", codigo: "1000", nome: "Administrativo", centroPaiId: null, empresaId: "e1", responsavel: "Marina Souza", ativo: true },
  { id: "cc1100", codigo: "1100", nome: "Financeiro", centroPaiId: "cc1000", empresaId: "e1", responsavel: "Marina Souza", ativo: true },
  { id: "cc1200", codigo: "1200", nome: "Contabilidade", centroPaiId: "cc1000", empresaId: "e1", responsavel: "Paulo Ribeiro", ativo: true },
  { id: "cc1300", codigo: "1300", nome: "Recursos Humanos", centroPaiId: "cc1000", empresaId: "e1", responsavel: "Camila Duarte", ativo: true },

  { id: "cc2000", codigo: "2000", nome: "Comercial", centroPaiId: null, empresaId: "e1", responsavel: "Rafael Torres", ativo: true },
  { id: "cc2100", codigo: "2100", nome: "Vendas", centroPaiId: "cc2000", empresaId: "e1", responsavel: "Rafael Torres", ativo: true },
  { id: "cc2200", codigo: "2200", nome: "Marketing", centroPaiId: "cc2000", empresaId: "e1", responsavel: "Juliana Prado", ativo: true },

  { id: "cc3000", codigo: "3000", nome: "Operações", centroPaiId: null, empresaId: "e2", responsavel: "Eduardo Nascimento", ativo: true },
  { id: "cc3100", codigo: "3100", nome: "Produção", centroPaiId: "cc3000", empresaId: "e2", responsavel: "Eduardo Nascimento", ativo: true },
  { id: "cc3200", codigo: "3200", nome: "Logística", centroPaiId: "cc3000", empresaId: "e2", responsavel: "Fernanda Lima", ativo: true },
];

// ---- Lançamentos (Fase 2) — dataset fictício cobrindo Realizado, Previsto,
// Em aberto (com exemplos vencidos), Cancelado e uma transferência interna,
// nas duas empresas, para exercitar Tesouraria, AP, AR, Fluxo de Caixa e DRE. ----

export const demoLancamentos = [
  { id: "l1", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-1001", dataEmissao: "2026-06-02", competencia: "2026-06", dataVencimento: "2026-06-02", dataPagamento: "2026-06-02", tipo: "Entrada", situacao: "Realizado", valor: 58000, observacao: "", transferencia: false },
  { id: "l2", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc2.01.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-2001", dataEmissao: "2026-06-03", competencia: "2026-06", dataVencimento: "2026-06-05", dataPagamento: "2026-06-05", tipo: "Saída", situacao: "Realizado", valor: 35000, observacao: "", transferencia: false },
  { id: "l3", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc3.03.01", centroCustoId: "cc2200", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f3", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-3001", dataEmissao: "2026-07-01", competencia: "2026-07", dataVencimento: "2026-07-09", dataPagamento: "2026-07-04", tipo: "Saída", situacao: "Realizado", valor: 21000, observacao: "", transferencia: false },
  { id: "l4", empresaId: "e1", unidadeId: "u2", contaGerencialId: "pc1.01.02", centroCustoId: "cc2100", projetoId: "p1", tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: "b1", contaBancariaId: "cb2", documento: "NF-1002", dataEmissao: "2026-07-01", competencia: "2026-07", dataVencimento: "2026-07-14", dataPagamento: null, tipo: "Entrada", situacao: "Em aberto", valor: 26000, observacao: "", transferencia: false },
  { id: "l5", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-1003", dataEmissao: "2026-07-25", competencia: "2026-07", dataVencimento: "2026-07-30", dataPagamento: null, tipo: "Entrada", situacao: "Previsto", valor: 68000, observacao: "", transferencia: false },
  { id: "l6", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc2.01.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f1", bancoId: "b1", contaBancariaId: "cb2", documento: "NF-2002", dataEmissao: "2026-07-20", competencia: "2026-07", dataVencimento: "2026-07-29", dataPagamento: null, tipo: "Saída", situacao: "Em aberto", valor: 125000, observacao: "", transferencia: false },
  { id: "l7", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc3.01.01", centroCustoId: "cc1300", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb1", documento: "Folha-07/2026", dataEmissao: "2026-07-30", competencia: "2026-07", dataVencimento: "2026-07-30", dataPagamento: null, tipo: "Saída", situacao: "Previsto", valor: 42000, observacao: "", transferencia: false },
  { id: "l8", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc3.02.01", centroCustoId: "cc1100", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb1", documento: "Aluguel-07", dataEmissao: "2026-07-05", competencia: "2026-07", dataVencimento: "2026-07-05", dataPagamento: "2026-07-05", tipo: "Saída", situacao: "Realizado", valor: 9000, observacao: "", transferencia: false },
  { id: "l9", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc4.03", centroCustoId: "cc1100", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb1", documento: "Tarifa-06", dataEmissao: "2026-06-28", competencia: "2026-06", dataVencimento: "2026-06-28", dataPagamento: "2026-06-28", tipo: "Saída", situacao: "Realizado", valor: 350, observacao: "", transferencia: false },
  { id: "l10", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc4.01", centroCustoId: "cc1100", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb3", documento: "Rend-06", dataEmissao: "2026-06-30", competencia: "2026-06", dataVencimento: "2026-06-30", dataPagamento: "2026-06-30", tipo: "Entrada", situacao: "Realizado", valor: 1200, observacao: "Rendimento da aplicação CDB", transferencia: false },
  { id: "l11", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc2.01.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-2003", dataEmissao: "2026-05-10", competencia: "2026-05", dataVencimento: "2026-05-15", dataPagamento: "2026-05-15", tipo: "Saída", situacao: "Realizado", valor: 28000, observacao: "", transferencia: false },
  { id: "l12", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c4", bancoId: "b1", contaBancariaId: "cb2", documento: "NF-1004", dataEmissao: "2026-05-20", competencia: "2026-05", dataVencimento: "2026-05-20", dataPagamento: "2026-05-20", tipo: "Entrada", situacao: "Realizado", valor: 44000, observacao: "", transferencia: false },
  { id: "l13", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc3.03.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb1", documento: "Com-Junho", dataEmissao: "2026-06-15", competencia: "2026-06", dataVencimento: "2026-06-20", dataPagamento: null, tipo: "Saída", situacao: "Cancelado", valor: 5000, observacao: "Cancelado - erro de lançamento", transferencia: false },

  { id: "l14", empresaId: "e2", unidadeId: "u3", contaGerencialId: "pc1.01.01", centroCustoId: "cc3000", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: "b3", contaBancariaId: "cb4", documento: "NF-9001", dataEmissao: "2026-07-10", competencia: "2026-07", dataVencimento: "2026-07-10", dataPagamento: "2026-07-10", tipo: "Entrada", situacao: "Realizado", valor: 92000, observacao: "", transferencia: false },
  { id: "l15", empresaId: "e2", unidadeId: "u3", contaGerencialId: "pc2.01.01", centroCustoId: "cc3100", projetoId: "p2", tipoParceiro: "Fornecedor", clienteFornecedorId: "f1", bancoId: "b3", contaBancariaId: "cb4", documento: "NF-9002", dataEmissao: "2026-07-15", competencia: "2026-07", dataVencimento: "2026-08-05", dataPagamento: null, tipo: "Saída", situacao: "Previsto", valor: 88000, observacao: "", transferencia: false },
  { id: "l16", empresaId: "e2", unidadeId: "u3", contaGerencialId: "pc2.01.03", centroCustoId: "cc3200", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f2", bancoId: "b3", contaBancariaId: "cb4", documento: "NF-9003", dataEmissao: "2026-07-18", competencia: "2026-07", dataVencimento: "2026-07-25", dataPagamento: null, tipo: "Saída", situacao: "Em aberto", valor: 15000, observacao: "", transferencia: false },
  { id: "l17", empresaId: "e2", unidadeId: "u3", contaGerencialId: "pc3.01.01", centroCustoId: "cc3100", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b3", contaBancariaId: "cb4", documento: "Folha-XYZ-07", dataEmissao: "2026-07-30", competencia: "2026-07", dataVencimento: "2026-07-30", dataPagamento: null, tipo: "Saída", situacao: "Previsto", valor: 65000, observacao: "", transferencia: false },

  { id: "l18a", empresaId: "e1", unidadeId: "u1", contaGerencialId: null, centroCustoId: null, projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b1", contaBancariaId: "cb2", documento: "TED-INTERNA-001", dataEmissao: "2026-07-15", competencia: "2026-07", dataVencimento: "2026-07-15", dataPagamento: "2026-07-15", tipo: "Saída", situacao: "Realizado", valor: 30000, observacao: "Transferência para aplicação", transferencia: true, transferenciaGrupoId: "tr1" },
  { id: "l18b", empresaId: "e1", unidadeId: "u1", contaGerencialId: null, centroCustoId: null, projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb3", documento: "TED-INTERNA-001", dataEmissao: "2026-07-15", competencia: "2026-07", dataVencimento: "2026-07-15", dataPagamento: "2026-07-15", tipo: "Entrada", situacao: "Realizado", valor: 30000, observacao: "Transferência para aplicação", transferencia: true, transferenciaGrupoId: "tr1" },
  { id: "l19", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc6.01", centroCustoId: "cc1200", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb1", documento: "IRPJCSLL-atual", dataEmissao: HOJE, competencia: MES_ATUAL, dataVencimento: HOJE, dataPagamento: HOJE, tipo: "Saída", situacao: "Realizado", valor: 12000, observacao: "IRPJ e CSLL apurados no mês", transferencia: false },
  { id: "l20", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-atual", dataEmissao: HOJE, competencia: MES_ATUAL, dataVencimento: HOJE, dataPagamento: HOJE, tipo: "Entrada", situacao: "Realizado", valor: 75000, observacao: "", transferencia: false },
];

// ---- Orçamento (Fase 5) — base própria, ano 2026, valores mensais fixos por
// simplicidade neste dataset demonstrativo (o usuário edita cada mês depois). ----

function gerarOrcamentoAno(ano, empresaId, contaGerencialId, valorMensal) {
  return Array.from({ length: 12 }, (_, mes) => ({
    id: `orc-${empresaId}-${contaGerencialId}-${ano}-${mes}`,
    ano, empresaId, contaGerencialId, centroCustoId: null, projetoId: null, mes, valor: valorMensal,
  }));
}

export const demoOrcamentoItens = [
  ...gerarOrcamentoAno(2026, "e1", "pc1.01.01", 60000),
  ...gerarOrcamentoAno(2026, "e1", "pc1.01.02", 30000),
  ...gerarOrcamentoAno(2026, "e1", "pc1.02.01", -6000),
  ...gerarOrcamentoAno(2026, "e1", "pc2.01.02", -30000),
  ...gerarOrcamentoAno(2026, "e1", "pc3.01.01", -40000),
  ...gerarOrcamentoAno(2026, "e1", "pc3.02.01", -9000),
  ...gerarOrcamentoAno(2026, "e1", "pc3.03.01", -15000),
  ...gerarOrcamentoAno(2026, "e2", "pc1.01.01", 70000),
  ...gerarOrcamentoAno(2026, "e2", "pc2.01.01", -80000),
  ...gerarOrcamentoAno(2026, "e2", "pc3.01.01", -60000),
];
