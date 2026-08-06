// Dataset demonstrativo — 100% fictício, em português, moeda R$/pt-BR.
// Construído para exercitar toda a hierarquia de Plano de Contas e Centro
// de Custo desde a Fase 1. Lançamentos reais de movimento entram na Fase 2.

import { gerarMassaSintetica } from "./demoDataGenerator.js";

// DRE/DFC/Tesouraria/Fluxo de Caixa/Contas a Pagar/Receber são módulos de
// FATO: sempre o "hoje" real do dispositivo, nunca uma data fixa. Por isso a
// massa sintética abaixo (gerarMassaSintetica) usa datas relativas a HOJE em
// vez de datas fixas — não "expira" conforme o relógio real avança. Ver
// disciplina completa em demoDataGenerator.js.

export const demoEmpresas = [
  { id: "e1", nome: "Comércio ABC Ltda", cnpj: "12.345.678/0001-01", ativo: true },
  { id: "e2", nome: "Indústria XYZ S.A.", cnpj: "23.456.789/0001-02", ativo: true },
];

export const demoUnidades = [
  { id: "u1", empresaId: "e1", nome: "Matriz - São Paulo", ativo: true },
  { id: "u2", empresaId: "e1", nome: "Filial - Campinas", ativo: true },
  { id: "u3", empresaId: "e2", nome: "Matriz - Curitiba", ativo: true },
];

// Expandido de 4 -> 10 (Bloco B/Etapa 1) para a carteira de ~2.000
// lançamentos sintéticos não concentrar tudo em 4 parceiros só.
export const demoClientes = [
  { id: "c1", nome: "Mercado Central Ltda", documento: "12.345.678/0001-90", ativo: true, regiao: "Sudeste" },
  { id: "c2", nome: "Distribuidora Sul Comércio", documento: "23.456.789/0001-11", ativo: true, regiao: "Sul" },
  { id: "c3", nome: "Construtora Horizonte Ltda", documento: "34.567.890/0001-22", ativo: true, regiao: "Sudeste" },
  { id: "c4", nome: "Farmácia Vida Saudável", documento: "45.678.901/0001-33", ativo: true, regiao: "Sudeste" },
  { id: "c5", nome: "Supermercados Bom Preço", documento: "56.789.012/0001-44", ativo: true, regiao: "Nordeste" },
  { id: "c6", nome: "Auto Peças Cruzeiro", documento: "67.890.123/0001-55", ativo: true, regiao: "Sul" },
  { id: "c7", nome: "Rede Confiança de Farmácias", documento: "78.901.234/0001-66", ativo: true, regiao: "Centro-Oeste" },
  { id: "c8", nome: "Papelaria Universo", documento: "89.012.345/0001-77", ativo: true, regiao: "Sudeste" },
  { id: "c9", nome: "Móveis Planejados Cedro", documento: "90.123.456/0001-88", ativo: true, regiao: "Sul" },
  { id: "c10", nome: "Comercial Nordeste Alimentos", documento: "01.234.567/0001-99", ativo: true, regiao: "Nordeste" },
];

export const demoFornecedores = [
  { id: "f1", nome: "Fornecedor Atacadista Nacional", documento: "11.222.333/0001-44", ativo: true },
  { id: "f2", nome: "Transportadora Rápido Brasil", documento: "22.333.444/0001-55", ativo: true },
  { id: "f3", nome: "Gráfica Impressão Total", documento: "33.444.555/0001-66", ativo: true },
  { id: "f4", nome: "Escritório Contábil Confiança", documento: "44.555.666/0001-77", ativo: true },
  { id: "f5", nome: "Indústria de Embalagens Sul", documento: "55.666.777/0001-88", ativo: true },
  { id: "f6", nome: "Distribuidora de Matéria-Prima Rocha", documento: "66.777.888/0001-99", ativo: true },
  { id: "f7", nome: "Logística Expressa Brasil", documento: "77.888.999/0001-00", ativo: true },
  { id: "f8", nome: "Manutenção Predial Ágil", documento: "88.999.000/0001-11", ativo: true },
];

export const demoBancos = [
  { id: "b1", nome: "Banco do Brasil", codigo: "001", ativo: true },
  { id: "b2", nome: "Itaú Unibanco", codigo: "341", ativo: true },
  { id: "b3", nome: "Bradesco", codigo: "237", ativo: true },
  { id: "b4", nome: "Caixa Econômica Federal", codigo: "104", ativo: true },
];

// Base pré-calibração: o saldoInicial das contas líquidas (semLiquidez !==
// "true") é recalculado por gerarMassaSintetica pra Caixa Disponível bater
// a faixa-alvo — o peso relativo abaixo (cb1 > cb2 > cb4) é preservado, só
// a escala muda. Ver "Calibração do saldo inicial" em demoDataGenerator.js.
const demoContasBancariasBase = [
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

// ---- Massa de dados sintética (Bloco B, Etapa 1) — 2.000 lançamentos
// gerados programaticamente (gerarMassaSintetica), evergreen (datas
// relativas a HOJE), calibrada pra Caixa Disponível, AP/AR em aberto e mix
// de vencimento baterem os alvos definidos com o usuário. Nunca hand-write
// mais lançamentos aqui — qualquer ajuste de volume/valor é um parâmetro em
// demoDataGenerator.js, não uma edição direta neste array.
const massaSintetica = gerarMassaSintetica({
  clientesIds: demoClientes.map((c) => c.id),
  fornecedoresIds: demoFornecedores.map((f) => f.id),
  contasBancariasBase: demoContasBancariasBase,
});

export const demoLancamentos = massaSintetica.lancamentos;
export const demoOrcamentoItens = massaSintetica.orcamentoItens;
export const demoContasBancarias = massaSintetica.contasBancarias;
