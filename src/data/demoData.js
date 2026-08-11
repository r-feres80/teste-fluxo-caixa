// Dataset demonstrativo — 100% fictício, em português, moeda R$/pt-BR.
// Construído para exercitar toda a hierarquia de Plano de Contas e Centro
// de Custo desde a Fase 1. Lançamentos reais de movimento entram na Fase 2.

import lancamentosImportadosRaw from "./lancamentosImportados.json" with { type: "json" };
import clientesImportados from "./clientesImportados.json" with { type: "json" };
import fornecedoresImportados from "./fornecedoresImportados.json" with { type: "json" };

// DRE/DFC/Tesouraria/Fluxo de Caixa/Contas a Pagar/Receber são módulos de
// FATO: sempre o "hoje" real do dispositivo, nunca uma data fixa. O dado real
// importado (Leva 3) usa datas fixas (maio-novembro/2026, planilha real de
// teste) — diferente da massa sintética anterior, que era evergreen. Ver
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
// lançamentos sintéticos não concentrar tudo em 4 parceiros só. Leva 3
// (import real) acrescenta mais 6 clientes/6 fornecedores que apareciam na
// planilha real e não existiam ainda — ver clientesImportados.json/
// fornecedoresImportados.json (auto-criados pela função real de import,
// scripts/mesmo fluxo de "Importar Dados").
const demoClientesBase = [
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
export const demoClientes = [...demoClientesBase, ...clientesImportados];

const demoFornecedoresBase = [
  { id: "f1", nome: "Fornecedor Atacadista Nacional", documento: "11.222.333/0001-44", ativo: true },
  { id: "f2", nome: "Transportadora Rápido Brasil", documento: "22.333.444/0001-55", ativo: true },
  { id: "f3", nome: "Gráfica Impressão Total", documento: "33.444.555/0001-66", ativo: true },
  { id: "f4", nome: "Escritório Contábil Confiança", documento: "44.555.666/0001-77", ativo: true },
  { id: "f5", nome: "Indústria de Embalagens Sul", documento: "55.666.777/0001-88", ativo: true },
  { id: "f6", nome: "Distribuidora de Matéria-Prima Rocha", documento: "66.777.888/0001-99", ativo: true },
  { id: "f7", nome: "Logística Expressa Brasil", documento: "77.888.999/0001-00", ativo: true },
  { id: "f8", nome: "Manutenção Predial Ágil", documento: "88.999.000/0001-11", ativo: true },
];
export const demoFornecedores = [...demoFornecedoresBase, ...fornecedoresImportados];

export const demoBancos = [
  { id: "b1", nome: "Banco do Brasil", codigo: "001", ativo: true },
  { id: "b2", nome: "Itaú Unibanco", codigo: "341", ativo: true },
  { id: "b3", nome: "Bradesco", codigo: "237", ativo: true },
  { id: "b4", nome: "Caixa Econômica Federal", codigo: "104", ativo: true },
  { id: "b5", nome: "Santander", codigo: "033", ativo: true },
];

// Saldo inicial USADO DIRETO, sem calibração/residual (ver comentário grande
// perto de demoLancamentos abaixo): calibrarContasBancarias (ainda em
// demoDataGenerator.js, só não chamada mais) forçava o saldoInicial pra
// fechar num alvo artificial de Caixa Disponível, o que exigia saldo
// NEGATIVO sempre que o fluxo Realizado ficasse forte demais — problema
// resolvido regenerando os VALORES dos lançamentos na origem (Custos/
// Despesas + pool de Receitas Financeiras) até Caixa Disponível/Liquidez
// caírem na faixa-alvo organicamente, sem precisar de nenhum ajuste de
// saldoInicial. 5 contas líquidas com pesos próximos (em vez de
// concentradas em 1-2 contas) — Composição do Caixa em Tesouraria fica mais
// distribuída (item 2/Etapa 4).
// cb3/cb7/cb8 (semLiquidez="true") ganham 3 campos extras (comando
// DFC-mapeamento item 2a): modalidade, taxaAnual (% ao ano) e dataAplicacao
// (ISO) — só essas contas, contas correntes normais não usam. prazoDias é
// SEMPRE calculado dinamicamente (diffDaysISO(dataAplicacao, hoje) em
// aplicacoesFinanceiras.js), nunca armazenado aqui: evita um campo que
// desatualiza sozinho conforme os dias passam. cb7/cb8 nascem com
// saldoInicial=0 — todo o principal delas entra via lançamento de aporte
// (transferência pc4.07) dentro da janela mai-nov/2026, não por saldo
// pré-existente (diferente de cb3, cujo saldoInicial já vem de antes da
// janela rastreada).
const demoContasBancariasBase = [
  { id: "cb1", bancoId: "b2", empresaId: "e1", apelido: "Conta Movimento", agencia: "1234", numero: "56789-0", saldoInicial: 45000, semLiquidez: "false", ativo: true },
  { id: "cb2", bancoId: "b1", empresaId: "e1", apelido: "Conta Movimento", agencia: "5678", numero: "12345-6", saldoInicial: 42000, semLiquidez: "false", ativo: true },
  { id: "cb3", bancoId: "b2", empresaId: "e1", apelido: "Aplicação CDB", agencia: "1234", numero: "99887-1", saldoInicial: 150000, semLiquidez: "true", ativo: true, modalidade: "CDB", taxaAnual: 12.5, dataAplicacao: "2025-11-01" },
  { id: "cb4", bancoId: "b3", empresaId: "e2", apelido: "Conta Movimento", agencia: "4321", numero: "34521-9", saldoInicial: 40000, semLiquidez: "false", ativo: true },
  { id: "cb5", bancoId: "b4", empresaId: "e1", apelido: "Conta Movimento", agencia: "9012", numero: "34567-8", saldoInicial: 38000, semLiquidez: "false", ativo: true },
  { id: "cb6", bancoId: "b5", empresaId: "e2", apelido: "Conta Movimento", agencia: "3456", numero: "78901-2", saldoInicial: 35000, semLiquidez: "false", ativo: true },
  { id: "cb7", bancoId: "b1", empresaId: "e1", apelido: "Aplicação LCI", agencia: "5678", numero: "77123-4", saldoInicial: 0, semLiquidez: "true", ativo: true, modalidade: "LCI", taxaAnual: 10.8, dataAplicacao: "2026-06-01" },
  { id: "cb8", bancoId: "b3", empresaId: "e2", apelido: "Aplicação Tesouro Selic", agencia: "4321", numero: "88456-2", saldoInicial: 0, semLiquidez: "true", ativo: true, modalidade: "Tesouro Selic", taxaAnual: 11.9, dataAplicacao: "2024-01-15" },
  // cb9/cb10/cb11 — cenário "aperto de tesouraria" (comando
  // cenario-tesouraria-aperto): varredura de quase todo o saldo líquido
  // (cb1/cb2/cb4/cb5/cb6) pra 3 tranches de CDB, via aporte real
  // (transferência) datado na própria dataAplicacao de cada tranche —
  // saldoInicial=0, todo o principal vem do aporte, mesmo padrão de
  // cb7/cb8. Resultado: Disponível cai pra R$10.000 (mínimo operacional),
  // Aplicações sobe na mesma proporção — nenhum caixa criado/destruído.
  { id: "cb9", bancoId: "b2", empresaId: "e1", apelido: "Aplicação CDB - Tranche 1", agencia: "1234", numero: "55201-3", saldoInicial: 0, semLiquidez: "true", ativo: true, modalidade: "CDB", taxaAnual: 12.5, dataAplicacao: "2026-05-11" },
  { id: "cb10", bancoId: "b3", empresaId: "e2", apelido: "Aplicação CDB - Tranche 2", agencia: "4321", numero: "55202-1", saldoInicial: 0, semLiquidez: "true", ativo: true, modalidade: "CDB", taxaAnual: 12.5, dataAplicacao: "2026-06-11" },
  { id: "cb11", bancoId: "b1", empresaId: "e1", apelido: "Aplicação CDB - Tranche 3", agencia: "5678", numero: "55203-8", saldoInicial: 0, semLiquidez: "true", ativo: true, modalidade: "CDB", taxaAnual: 12.5, dataAplicacao: "2026-07-31" },
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
  // pc1.01.03-05: mesmo grupo/DRE de Venda de Produtos/Prestação de Serviços —
  // mantidas como contas distintas (nomes diferentes na planilha real, Leva 3)
  // em vez de mescladas; DRE totaliza por classificacaoDRE, então "Receita
  // Bruta" soma as duas gerações corretamente mesmo com nomes duplicando
  // conceito. Ver relato ao usuário sobre essa escolha.
  { id: "pc1.01.03", codigo: "1.01.03", descricao: "Vendas", contaPaiId: "pc1.01", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Receita Bruta", classificacaoDFC: "Operacional", subgrupoDFC: "Entradas", entradaSaida: "Entrada", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc1.01.04", codigo: "1.01.04", descricao: "Serviços Prestados", contaPaiId: "pc1.01", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Receita Bruta", classificacaoDFC: "Operacional", subgrupoDFC: "Entradas", entradaSaida: "Entrada", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc1.01.05", codigo: "1.01.05", descricao: "Outras Receitas", contaPaiId: "pc1.01", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Receita Bruta", classificacaoDFC: "Operacional", subgrupoDFC: "Entradas", entradaSaida: "Entrada", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc1.02", codigo: "1.02", descricao: "Deduções", contaPaiId: "pc1", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc1.02.01", codigo: "1.02.01", descricao: "Impostos sobre Vendas", contaPaiId: "pc1.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Deduções", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc1.02.02", codigo: "1.02.02", descricao: "COFINS", contaPaiId: "pc1.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Deduções", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc1.02.03", codigo: "1.02.03", descricao: "ICMS ST", contaPaiId: "pc1.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Deduções", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc1.02.04", codigo: "1.02.04", descricao: "PIS", contaPaiId: "pc1.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Deduções", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc1.02.05", codigo: "1.02.05", descricao: "ISS", contaPaiId: "pc1.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Deduções", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },

  { id: "pc2", codigo: "2", descricao: "CUSTOS", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc2.01", codigo: "2.01", descricao: "Custos Operacionais", contaPaiId: "pc2", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc2.01.01", codigo: "2.01.01", descricao: "Matéria-Prima", contaPaiId: "pc2.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Custos", classificacaoDFC: "Operacional", subgrupoDFC: "Saídas Diretas", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc2.01.02", codigo: "2.01.02", descricao: "Mercadorias", contaPaiId: "pc2.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Custos", classificacaoDFC: "Operacional", subgrupoDFC: "Saídas Diretas", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc2.01.03", codigo: "2.01.03", descricao: "Fretes", contaPaiId: "pc2.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Custos", classificacaoDFC: "Operacional", subgrupoDFC: "Saídas Diretas", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc2.01.04", codigo: "2.01.04", descricao: "Compra de Matéria-Prima", contaPaiId: "pc2.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Custos", classificacaoDFC: "Operacional", subgrupoDFC: "Saídas Diretas", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc2.01.05", codigo: "2.01.05", descricao: "Pagamento a Fornecedores", contaPaiId: "pc2.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Custos", classificacaoDFC: "Operacional", subgrupoDFC: "Saídas Diretas", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  // Reclassificada de Despesas Administrativas/Real Estate e Facilities (era
  // pc3.02.02) — decisão de negócio: energia elétrica reflete consumo da
  // operação, não da sede. Id mantido igual ao original só pra não quebrar
  // o contaGerencialId dos 77 lançamentos que já referenciam essa conta (37
  // Realizado + 40 Previsto) — só codigo/contaPaiId/classificacaoDRE/
  // subgrupoDFC mudaram; nenhum lançamento precisou ser tocado.
  { id: "pc3.02.02", codigo: "2.01.06", descricao: "Energia Elétrica", contaPaiId: "pc2.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Custos", classificacaoDFC: "Operacional", subgrupoDFC: "Saídas Diretas", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },

  { id: "pc3", codigo: "3", descricao: "DESPESAS OPERACIONAIS", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc3.01", codigo: "3.01", descricao: "Pessoal", contaPaiId: "pc3", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc3.01.01", codigo: "3.01.01", descricao: "Salários", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Pessoal", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.02", codigo: "3.01.02", descricao: "Encargos", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos de Folha", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.03", codigo: "3.01.03", descricao: "Benefícios", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Benefícios", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.04", codigo: "3.01.04", descricao: "13º Salário", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Pessoal", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.05", codigo: "3.01.05", descricao: "Férias", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Pessoal", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.06", codigo: "3.01.06", descricao: "INSS", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos de Folha", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.07", codigo: "3.01.07", descricao: "IRRF", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos de Folha", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.08", codigo: "3.01.08", descricao: "Assistência Médica/Odontológica", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Benefícios", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.01.09", codigo: "3.01.09", descricao: "Seguro de Vida", contaPaiId: "pc3.01", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas com Pessoal", classificacaoDFC: "Operacional", subgrupoDFC: "Benefícios", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02", codigo: "3.02", descricao: "Administrativas", contaPaiId: "pc3", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc3.02.01", codigo: "3.02.01", descricao: "Aluguel", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Real Estate e Facilities", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02.03", codigo: "3.02.03", descricao: "Sistemas", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Outros Operacionais", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02.04", codigo: "3.02.04", descricao: "Condomínio", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Real Estate e Facilities", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02.05", codigo: "3.02.05", descricao: "Contabilidade", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Terceiros e Consultorias", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02.06", codigo: "3.02.06", descricao: "Jurídico", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Terceiros e Consultorias", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02.07", codigo: "3.02.07", descricao: "Suporte em TI e Softwares", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Outros Operacionais", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.02.08", codigo: "3.02.08", descricao: "Telefonia e Internet", contaPaiId: "pc3.02", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Administrativas", classificacaoDFC: "Operacional", subgrupoDFC: "Real Estate e Facilities", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.03", codigo: "3.03", descricao: "Comercial", contaPaiId: "pc3", tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc3.03.01", codigo: "3.03.01", descricao: "Marketing e Publicidade", contaPaiId: "pc3.03", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Comerciais", classificacaoDFC: "Operacional", subgrupoDFC: "Marketing e Publicidade", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.03.02", codigo: "3.03.02", descricao: "Comissões sobre Vendas", contaPaiId: "pc3.03", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Comerciais", classificacaoDFC: "Operacional", subgrupoDFC: "Outros Operacionais", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.03.03", codigo: "3.03.03", descricao: "Comissões Externas", contaPaiId: "pc3.03", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Comerciais", classificacaoDFC: "Operacional", subgrupoDFC: "Outros Operacionais", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.03.04", codigo: "3.03.04", descricao: "Comissões Internas", contaPaiId: "pc3.03", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Comerciais", classificacaoDFC: "Operacional", subgrupoDFC: "Pessoal", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.03.05", codigo: "3.03.05", descricao: "Despesas de Viagem", contaPaiId: "pc3.03", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Comerciais", classificacaoDFC: "Operacional", subgrupoDFC: "Outros Operacionais", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc3.04", codigo: "3.04", descricao: "Despesas Diversas", contaPaiId: "pc3", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Outras Despesas Operacionais", classificacaoDFC: "Operacional", subgrupoDFC: "Outros Operacionais", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },

  { id: "pc4", codigo: "4", descricao: "RESULTADO FINANCEIRO", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc4.01", codigo: "4.01", descricao: "Receitas Financeiras", contaPaiId: "pc4", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Receitas Financeiras", classificacaoDFC: "Financiamento", subgrupoDFC: "Receitas Financeiras", entradaSaida: "Entrada", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },
  { id: "pc4.02", codigo: "4.02", descricao: "Juros", contaPaiId: "pc4", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Financeiras", classificacaoDFC: "Financiamento", subgrupoDFC: "Despesas Financeiras", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },
  { id: "pc4.03", codigo: "4.03", descricao: "Tarifas Bancárias", contaPaiId: "pc4", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Despesas Financeiras", classificacaoDFC: "Financiamento", subgrupoDFC: "Despesas Financeiras", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },
  { id: "pc4.04", codigo: "4.04", descricao: "Aplicações Financeiras", contaPaiId: "pc4", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Receitas Financeiras", classificacaoDFC: "Financiamento", subgrupoDFC: "Receitas Financeiras", entradaSaida: "Entrada", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },
  { id: "pc4.05", codigo: "4.05", descricao: "Captações", contaPaiId: "pc4", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Financiamento", subgrupoDFC: "Captações", entradaSaida: "Entrada", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },
  { id: "pc4.06", codigo: "4.06", descricao: "Recuperação de Créditos", contaPaiId: "pc4", tipo: "Analítica", natureza: "Credora", classificacaoDRE: "Receitas Financeiras", classificacaoDFC: "Operacional", subgrupoDFC: "Entradas", entradaSaida: "Entrada", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },

  { id: "pc5", codigo: "5", descricao: "INVESTIMENTOS", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc5.01", codigo: "5.01", descricao: "Máquinas e Equipamentos", contaPaiId: "pc5", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Investimento", subgrupoDFC: "Investimentos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc5.02", codigo: "5.02", descricao: "Tecnologia", contaPaiId: "pc5", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Investimento", subgrupoDFC: "Investimentos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc5.03", codigo: "5.03", descricao: "Veículos", contaPaiId: "pc5", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Investimento", subgrupoDFC: "Investimentos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc5.04", codigo: "5.04", descricao: "Aquisição de Imobilizado", contaPaiId: "pc5", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Investimento", subgrupoDFC: "Investimentos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  { id: "pc5.05", codigo: "5.05", descricao: "Capex - Projetos", contaPaiId: "pc5", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Investimento", subgrupoDFC: "Investimentos", entradaSaida: "Saída", centroCustoObrigatorio: true, aceitaOrcamento: true, ativo: true },
  // Aporte/Resgate de Aplicações Financeiras — comando DFC-caixa-real: agora
  // que "caixa" do DFC é só o Disponível (contas líquidas), aplicar em CDB/
  // LCI/Tesouro é USO de caixa (Atividades de Investimento, igual Aquisição
  // de Imobilizado), resgatar é FONTE de caixa. Só o lado da transferência
  // que toca uma conta líquida (contaBancariaId semLiquidez != "true") entra
  // aqui — o lado que entra/sai da própria aplicação nunca teve efeito sobre
  // o Disponível, então fica de fora (ver filtrarParaCaixaDisponivel em
  // lancamentos.js). aceitaOrcamento false: aporte/resgate é decisão de
  // tesouraria pontual, não faz sentido orçar como uma despesa recorrente.
  { id: "pc5.06", codigo: "5.06", descricao: "Aplicações e Resgates", contaPaiId: "pc5", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Investimento", subgrupoDFC: "Aplicações e Resgates", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },

  // IRPJ e CSLL: a planilha real (Leva 3) traz "IRPJ" e "CSLL" como linhas
  // separadas, mas por decisão do usuário elas são remapeadas para esta
  // mesma conta combinada no momento da importação (ver ETAPA_ORIGEM_CONTA
  // em demoData.js/script de import) — não duas contas novas.
  { id: "pc6", codigo: "6", descricao: "IMPOSTOS SOBRE O LUCRO", contaPaiId: null, tipo: "Sintética", natureza: "Devedora", classificacaoDRE: "Fora do DRE", classificacaoDFC: "Fora do DFC", subgrupoDFC: "", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: false, ativo: true },
  { id: "pc6.01", codigo: "6.01", descricao: "IRPJ e CSLL", contaPaiId: "pc6", tipo: "Analítica", natureza: "Devedora", classificacaoDRE: "Impostos sobre o Lucro", classificacaoDFC: "Operacional", subgrupoDFC: "Impostos sobre o Lucro", entradaSaida: "Saída", centroCustoObrigatorio: false, aceitaOrcamento: true, ativo: true },
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

// ---- Massa de dados real (Leva 3) — 3.192 lançamentos de teste importados
// da planilha real do usuário (lancamentos_3k_mai_nov.csv), processados pela
// MESMA função de import que a tela "Importar Dados" usa (normalizarLinha/
// marcarDuplicados de financial-engine/importacao.js — ver
// lancamentosImportados.json). Substitui a massa sintética da Bloco B/Etapa
// 1 (gerarMassaSintetica ainda existe em demoDataGenerator.js, só não é mais
// chamada aqui). Datas são FIXAS (maio-novembro/2026, não evergreen) — dado
// real de teste, não sintético relativo a HOJE.
//
// Correção completa de EBITDA (checkpoint pós-Leva 3): os VALORES das 617
// linhas Realizado de Custos/Despesas Operacionais (pc2.*/pc3.*) foram
// REGENERADOS na origem (lancamentosImportados.json), não reescalados por
// fator fixo — técnica de redistribuição por peso aleatório de
// gerarCarteiraAberta (Etapa 1), com o TOTAL-ALVO encontrado por busca
// binária real (gera -> roda calcularDRE de verdade -> ajusta -> repete)
// até a margem EBITDA YTD cair em 10-15% da Receita Bruta Realizada (fechou
// em 12,5%, ficou intocado desde então). Isso tornou o fluxo de caixa
// Realizado fortemente positivo, jogando Caixa Disponível/Liquidez bem
// acima de qualquer faixa razoável — nessa rodada isso tinha sido aceito
// como trade-off (Caixa/Liquidez "sem faixa-alvo").
//
// Comando consolidado, Bloco 1 (decisão do usuário — reabre esse trade-off):
// investigando por que Liquidez não descia mesmo weakening Custos/Despesas,
// achamos a causa real: um pool de Receitas Financeiras Realizado
// (Aplicações Financeiras/pc4.04 + Captações/pc4.05 + Recuperação de
// Créditos/pc4.06) somando R$3,15M — 80% do tamanho da própria Receita
// Bruta, mesmo tipo de valor de teste desproporcional dos Custos originais,
// só que do lado de Entrada, por isso nunca tinha sido tocado (regra era
// "não mexer em Entradas/Receita", mas esse pool não é Receita Bruta/
// Vendas). Regenerado com a MESMA técnica (peso aleatório + busca binária,
// agora contra calcularIndiceLiquidezCaixa/calcularPosicaoConsolidada reais)
// até a Liquidez cair em 1,5x-1,9x — fechou em 1,70x, Caixa Disponível
// R$722.500, sem tocar em Custos/Despesas (EBITDA já estava em 12,5%,
// dentro da faixa, ficou exatamente igual) nem em AP/AR/saldoInicial. Caixa
// Disponível e Liquidez voltam a ter faixa-alvo, agora DERIVADA da
// Liquidez-alvo × AP em aberto. Ver scripts/verificar-massa-sintetica.mjs.
export const demoLancamentos = lancamentosImportadosRaw;
export const demoContasBancarias = demoContasBancariasBase;

// Comando consolidado, Bloco 2 (decisão do usuário): removida a geração
// automática de orçamento sintético (gerarOrcamentoAutomatico, ainda em
// demoDataGenerator.js, só não chamada mais). O app agora sobe SEM nenhum
// item de orçamento pré-carregado — orçamento passa a vir exclusivamente
// da planilha real, importada pela tela "Importar Orçamento". Evita que a
// checagem de duplicata (marcarDuplicadosOrcamento, que não considera
// empresa — só conta+ano+mês) rejeite a importação real por colidir com o
// orçamento sintético pré-existente (792 itens cobrindo os 12 meses de
// toda conta orçável — quase qualquer linha real de um orçamento de
// verdade ia bater "duplicada" contra algum desses).
export const demoOrcamentoItens = [];
