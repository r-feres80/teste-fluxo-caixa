// Dataset demonstrativo — 100% fictício, em português, moeda R$/pt-BR.
// Construído para exercitar toda a hierarquia de Plano de Contas e Centro
// de Custo desde a Fase 1. Lançamentos reais de movimento entram na Fase 2.

import { todayISO, addDaysISO } from "../utils/dateUtils.js";

// DRE/DFC/Tesouraria/Fluxo de Caixa/Contas a Pagar/Receber são módulos de
// FATO: sempre o "hoje" real do dispositivo, nunca uma data fixa. Se os
// lançamentos demo tivessem competência/vencimento fixos em "2026-07", o
// dataset "expiraria" assim que o relógio real passasse de julho/2026 — os
// módulos de FATO passariam a mostrar tudo zerado, não por bug, mas porque
// nenhum lançamento cairia mais no mês corrente. Os 2 lançamentos abaixo
// (l19, l20) usam o mês REAL atual para nunca ficarem obsoletos.
const HOJE = todayISO();
const MES_ATUAL = HOJE.slice(0, 7);

// O DFC Direto (Leva 2) mostra só o mês corrente — se o "hoje" real cair
// cedo no mês (ex.: dia 3), um deslocamento negativo fixo (e.g. -9 dias)
// cruzaria para o mês anterior e o lançamento sumiria da tela sem nenhum
// lançamento estar "errado". diaDoMesAtras satura o deslocamento desejado
// ao que já se passou no mês corrente, então os lançamentos sempre aparecem
// dentro do mês atual, espalhando-se mais conforme o mês avança.
const DIA_ATUAL = Number(HOJE.slice(8, 10));
const diaDoMesAtras = (offsetDesejado) => addDaysISO(HOJE, -Math.min(offsetDesejado, DIA_ATUAL - 1));

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

  // ---- Leva 2 (Módulos analíticos) — lançamentos adicionais, com datas
  // relativas a HOJE (nunca fixas), para exercitar: DFC Direto (mês
  // corrente), Aging de Vencidos Recebidos AR/AP, PDD (saldo vencido aberto),
  // e Previsto x Recebido (série diária, últimos 30 dias). ----

  // DFC Direto — espalhados no mês corrente, cobrindo Operacional/Investimento/
  // Financiamento e vários subgrupos, com Orçado correspondente (ver demoOrcamentoItens).
  { id: "l21", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc2.01.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-2004", dataEmissao: diaDoMesAtras(2), competencia: diaDoMesAtras(2).slice(0, 7), dataVencimento: diaDoMesAtras(2), dataPagamento: diaDoMesAtras(2), tipo: "Saída", situacao: "Realizado", valor: 18000, observacao: "", transferencia: false },
  { id: "l22", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc3.01.01", centroCustoId: "cc1300", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb1", documento: "Adto-Salarios", dataEmissao: diaDoMesAtras(5), competencia: diaDoMesAtras(5).slice(0, 7), dataVencimento: diaDoMesAtras(5), dataPagamento: diaDoMesAtras(5), tipo: "Saída", situacao: "Realizado", valor: 8000, observacao: "", transferencia: false },
  { id: "l23", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc3.02.01", centroCustoId: "cc1100", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb1", documento: "Aluguel-Atual", dataEmissao: diaDoMesAtras(6), competencia: diaDoMesAtras(6).slice(0, 7), dataVencimento: diaDoMesAtras(6), dataPagamento: diaDoMesAtras(6), tipo: "Saída", situacao: "Realizado", valor: 9000, observacao: "", transferencia: false },
  { id: "l24", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: "b1", contaBancariaId: "cb2", documento: "NF-1005", dataEmissao: diaDoMesAtras(4), competencia: diaDoMesAtras(4).slice(0, 7), dataVencimento: diaDoMesAtras(4), dataPagamento: diaDoMesAtras(4), tipo: "Entrada", situacao: "Realizado", valor: 31000, observacao: "", transferencia: false },
  { id: "l25", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc4.02", centroCustoId: "cc1100", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb1", documento: "Juros-Atual", dataEmissao: diaDoMesAtras(1), competencia: diaDoMesAtras(1).slice(0, 7), dataVencimento: diaDoMesAtras(1), dataPagamento: diaDoMesAtras(1), tipo: "Saída", situacao: "Realizado", valor: 2100, observacao: "", transferencia: false },
  { id: "l26", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc5.02", centroCustoId: "cc1100", projetoId: null, tipoParceiro: null, clienteFornecedorId: null, bancoId: "b2", contaBancariaId: "cb1", documento: "Capex-Tech", dataEmissao: diaDoMesAtras(9), competencia: diaDoMesAtras(9).slice(0, 7), dataVencimento: diaDoMesAtras(9), dataPagamento: diaDoMesAtras(9), tipo: "Saída", situacao: "Realizado", valor: 15000, observacao: "", transferencia: false },

  // Aging de Vencidos Recebidos — AR (Realizado, baixa após vencimento), cobrindo as 8 faixas.
  { id: "l27", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-101", dataEmissao: addDaysISO(HOJE, -33), competencia: addDaysISO(HOJE, -33).slice(0, 7), dataVencimento: addDaysISO(HOJE, -30), dataPagamento: addDaysISO(HOJE, -20), tipo: "Entrada", situacao: "Realizado", valor: 9000, observacao: "", transferencia: false },
  { id: "l28", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-102", dataEmissao: addDaysISO(HOJE, -63), competencia: addDaysISO(HOJE, -63).slice(0, 7), dataVencimento: addDaysISO(HOJE, -60), dataPagamento: addDaysISO(HOJE, -35), tipo: "Entrada", situacao: "Realizado", valor: 14000, observacao: "", transferencia: false },
  { id: "l29", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-103", dataEmissao: addDaysISO(HOJE, -103), competencia: addDaysISO(HOJE, -103).slice(0, 7), dataVencimento: addDaysISO(HOJE, -100), dataPagamento: addDaysISO(HOJE, -55), tipo: "Entrada", situacao: "Realizado", valor: 22000, observacao: "", transferencia: false },
  { id: "l30", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c4", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-104", dataEmissao: addDaysISO(HOJE, -163), competencia: addDaysISO(HOJE, -163).slice(0, 7), dataVencimento: addDaysISO(HOJE, -160), dataPagamento: addDaysISO(HOJE, -85), tipo: "Entrada", situacao: "Realizado", valor: 17000, observacao: "", transferencia: false },
  { id: "l31", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-105", dataEmissao: addDaysISO(HOJE, -223), competencia: addDaysISO(HOJE, -223).slice(0, 7), dataVencimento: addDaysISO(HOJE, -220), dataPagamento: addDaysISO(HOJE, -110), tipo: "Entrada", situacao: "Realizado", valor: 12000, observacao: "", transferencia: false },
  { id: "l32", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c4", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-106", dataEmissao: addDaysISO(HOJE, -353), competencia: addDaysISO(HOJE, -353).slice(0, 7), dataVencimento: addDaysISO(HOJE, -350), dataPagamento: addDaysISO(HOJE, -215), tipo: "Entrada", situacao: "Realizado", valor: 11000, observacao: "", transferencia: false },
  { id: "l33", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-107", dataEmissao: addDaysISO(HOJE, -303), competencia: addDaysISO(HOJE, -303).slice(0, 7), dataVencimento: addDaysISO(HOJE, -300), dataPagamento: addDaysISO(HOJE, -140), tipo: "Entrada", situacao: "Realizado", valor: 20000, observacao: "", transferencia: false },
  { id: "l34", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-108", dataEmissao: addDaysISO(HOJE, -403), competencia: addDaysISO(HOJE, -403).slice(0, 7), dataVencimento: addDaysISO(HOJE, -400), dataPagamento: addDaysISO(HOJE, -190), tipo: "Entrada", situacao: "Realizado", valor: 25000, observacao: "", transferencia: false },

  // Aging de Vencidos Recebidos — AP (Realizado, baixa após vencimento).
  { id: "l35", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc2.01.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AP-201", dataEmissao: addDaysISO(HOJE, -43), competencia: addDaysISO(HOJE, -43).slice(0, 7), dataVencimento: addDaysISO(HOJE, -40), dataPagamento: addDaysISO(HOJE, -28), tipo: "Saída", situacao: "Realizado", valor: 8000, observacao: "", transferencia: false },
  { id: "l36", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc2.01.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f2", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AP-202", dataEmissao: addDaysISO(HOJE, -83), competencia: addDaysISO(HOJE, -83).slice(0, 7), dataVencimento: addDaysISO(HOJE, -80), dataPagamento: addDaysISO(HOJE, -50), tipo: "Saída", situacao: "Realizado", valor: 13000, observacao: "", transferencia: false },
  { id: "l37", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc2.01.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f3", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AP-203", dataEmissao: addDaysISO(HOJE, -153), competencia: addDaysISO(HOJE, -153).slice(0, 7), dataVencimento: addDaysISO(HOJE, -150), dataPagamento: addDaysISO(HOJE, -90), tipo: "Saída", situacao: "Realizado", valor: 9500, observacao: "", transferencia: false },
  { id: "l38", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc2.01.02", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Fornecedor", clienteFornecedorId: "f4", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AP-204", dataEmissao: addDaysISO(HOJE, -263), competencia: addDaysISO(HOJE, -263).slice(0, 7), dataVencimento: addDaysISO(HOJE, -260), dataPagamento: addDaysISO(HOJE, -170), tipo: "Saída", situacao: "Realizado", valor: 16000, observacao: "", transferencia: false },

  // PDD — saldo vencido AR ainda em aberto (sem baixa), cobrindo as 6 faixas de provisão.
  { id: "l39", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-301", dataEmissao: addDaysISO(HOJE, -13), competencia: addDaysISO(HOJE, -13).slice(0, 7), dataVencimento: addDaysISO(HOJE, -10), dataPagamento: null, tipo: "Entrada", situacao: "Em aberto", valor: 19000, observacao: "", transferencia: false },
  { id: "l40", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-302", dataEmissao: addDaysISO(HOJE, -48), competencia: addDaysISO(HOJE, -48).slice(0, 7), dataVencimento: addDaysISO(HOJE, -45), dataPagamento: null, tipo: "Entrada", situacao: "Em aberto", valor: 13500, observacao: "", transferencia: false },
  { id: "l41", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-303", dataEmissao: addDaysISO(HOJE, -78), competencia: addDaysISO(HOJE, -78).slice(0, 7), dataVencimento: addDaysISO(HOJE, -75), dataPagamento: null, tipo: "Entrada", situacao: "Em aberto", valor: 21000, observacao: "", transferencia: false },
  { id: "l42", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c4", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-304", dataEmissao: addDaysISO(HOJE, -108), competencia: addDaysISO(HOJE, -108).slice(0, 7), dataVencimento: addDaysISO(HOJE, -105), dataPagamento: null, tipo: "Entrada", situacao: "Em aberto", valor: 16500, observacao: "", transferencia: false },
  { id: "l43", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c2", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-305", dataEmissao: addDaysISO(HOJE, -153), competencia: addDaysISO(HOJE, -153).slice(0, 7), dataVencimento: addDaysISO(HOJE, -150), dataPagamento: null, tipo: "Entrada", situacao: "Em aberto", valor: 24000, observacao: "", transferencia: false },
  { id: "l44", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-306", dataEmissao: addDaysISO(HOJE, -223), competencia: addDaysISO(HOJE, -223).slice(0, 7), dataVencimento: addDaysISO(HOJE, -220), dataPagamento: null, tipo: "Entrada", situacao: "Em aberto", valor: 30000, observacao: "", transferencia: false },

  // Previsto x Recebido — mais pontos na série diária dos últimos 30 dias (recebidos em dia).
  { id: "l45", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-401", dataEmissao: addDaysISO(HOJE, -28), competencia: addDaysISO(HOJE, -28).slice(0, 7), dataVencimento: addDaysISO(HOJE, -25), dataPagamento: addDaysISO(HOJE, -25), tipo: "Entrada", situacao: "Realizado", valor: 15000, observacao: "", transferencia: false },
  { id: "l46", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c4", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-402", dataEmissao: addDaysISO(HOJE, -21), competencia: addDaysISO(HOJE, -21).slice(0, 7), dataVencimento: addDaysISO(HOJE, -18), dataPagamento: addDaysISO(HOJE, -18), tipo: "Entrada", situacao: "Realizado", valor: 20000, observacao: "", transferencia: false },
  { id: "l47", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c3", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-403", dataEmissao: addDaysISO(HOJE, -11), competencia: addDaysISO(HOJE, -11).slice(0, 7), dataVencimento: addDaysISO(HOJE, -8), dataPagamento: addDaysISO(HOJE, -6), tipo: "Entrada", situacao: "Realizado", valor: 12500, observacao: "", transferencia: false },
  { id: "l48", empresaId: "e1", unidadeId: "u1", contaGerencialId: "pc1.01.01", centroCustoId: "cc2100", projetoId: null, tipoParceiro: "Cliente", clienteFornecedorId: "c1", bancoId: "b2", contaBancariaId: "cb1", documento: "NF-AR-404", dataEmissao: addDaysISO(HOJE, -6), competencia: addDaysISO(HOJE, -6).slice(0, 7), dataVencimento: addDaysISO(HOJE, -3), dataPagamento: addDaysISO(HOJE, -3), tipo: "Entrada", situacao: "Realizado", valor: 17000, observacao: "", transferencia: false },
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
  ...gerarOrcamentoAno(2026, "e1", "pc4.02", -2500),
  ...gerarOrcamentoAno(2026, "e1", "pc5.02", -12000),
  ...gerarOrcamentoAno(2026, "e2", "pc1.01.01", 70000),
  ...gerarOrcamentoAno(2026, "e2", "pc2.01.01", -80000),
  ...gerarOrcamentoAno(2026, "e2", "pc3.01.01", -60000),
];
