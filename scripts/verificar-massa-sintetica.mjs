// Verificação da massa de dados (Bloco B, Etapa 1 + Leva 3 dado real) — roda
// os mesmos cálculos reais do app (financial-engine, nunca uma versão
// paralela) sobre o dataset, e imprime os números que importam pra
// calibração: Caixa/Projetado 30d (informativos, sem faixa-alvo desde a
// correção completa de EBITDA), AP/AR em aberto (critério), mix de
// vencimento, receita mensal do DRE, EBITDA (critério) e Orçado x Realizado.
// Nunca ajuste um número aqui — ajuste o parâmetro de entrada em
// src/data/lancamentosImportados.json ou demoDataGenerator.js.
//
// Rodar: node scripts/verificar-massa-sintetica.mjs
import { demoLancamentos, demoOrcamentoItens, demoContasBancarias, demoPlanoDeContas, demoClientes, demoFornecedores } from "../src/data/demoData.js";
import { calcularPosicaoConsolidada } from "../src/financial-engine/tesouraria.js";
import { buildFluxoCaixaDiario, menorPontoDaSerie } from "../src/financial-engine/fluxoCaixa.js";
import { calcularCarteiraEAging } from "../src/financial-engine/aging.js";
import { calcularDRE } from "../src/financial-engine/dre.js";
import { calcularDFC } from "../src/financial-engine/dfc.js";
import { construirOrcadoRealizado } from "../src/financial-engine/orcadoRealizado.js";
import { calcularIndiceLiquidezCaixa } from "../src/financial-engine/indicadoresCaixa.js";
import { todayISO, diffDaysISO, startOfMonthISO, endOfMonthISO, addDaysISO } from "../src/utils/dateUtils.js";

// Faixas-alvo — Leva 3 (checkpoint de regressão AP/AR/Liquidez/EBITDA):
// AP/AR "em aberto" não é mais calibrado por fluxo acumulado do período
// (isso gerava um AP/AR proporcional aos meses de janela Previsto, não ao
// saldo em aberto real); o alvo de AP agora vem da própria fórmula de
// Liquidez com Caixa Disponível fixo — ver decisão do usuário no checkpoint.
const AP_ABERTO_MIN = 380000, AP_ABERTO_MAX = 470000;
const AR_ABERTO_MIN = 550000, AR_ABERTO_MAX = 660000;
const EBITDA_MARGEM_MIN = 10, EBITDA_MARGEM_MAX = 15;
//
// Correção completa de EBITDA (checkpoint pós-Leva 3, decisão do usuário):
// os valores das linhas Realizado de Custos/Despesas Operacionais foram
// REGENERADOS na origem (lancamentosImportados.json, técnica de
// gerarCarteiraAberta + busca binária real contra calcularDRE), não
// reescalados por fator fixo — resolve o problema estrutural das duas
// tentativas anteriores (fator único e otimização por empresa, ambas
// tetadas bem abaixo de 10-15% por causa do alvo fixo de Caixa Disponível).
//
// Trade-off aceito conscientemente: isso torna o Realizado do período
// fortemente positivo em caixa, então Caixa Disponível e o Índice de
// Liquidez de Caixa DEIXARAM DE TER faixa-alvo — são reportados como
// RESULTADO do cálculo, não mais validados contra um número fixo (o antigo
// alvo de 600-850k só existia pra caber num Caixa artificialmente pequeno;
// mantê-lo exigiria saldoInicial negativo, o problema original). Só EBITDA
// (10-15%) e AP/AR em aberto (intocados, devem continuar batendo a mesma
// faixa de sempre) são critério de aceite agora.

const HOJE = todayISO();
const fmt = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");

console.log("=== VOLUME ===");
console.log("Total lançamentos:", demoLancamentos.length);
console.log("Data de referência (HOJE):", HOJE);

console.log("\n=== CAIXA (Tesouraria/Dashboard) ===");
const posicao = calcularPosicaoConsolidada(demoContasBancarias.filter((c) => c.ativo), demoLancamentos, HOJE);
console.log("Total consolidado:", fmt(posicao.total));
console.log("Aplicações (sem liquidez):", fmt(posicao.aplicacoes));
console.log("Disponível:", fmt(posicao.disponivel), "(sem faixa-alvo — resultado do fluxo, não mais critério de aceite)");
console.log("Nenhum saldoInicial negativo:", demoContasBancarias.every((c) => c.saldoInicial >= 0) ? "OK" : "FALHOU");
demoContasBancarias.forEach((c) => console.log(`  ${c.id} (${c.empresaId}, ${c.semLiquidez === "true" ? "aplicação" : "líquida"}): saldoInicial=${fmt(c.saldoInicial)}`));

const serie30 = buildFluxoCaixaDiario({ lancamentos: demoLancamentos, saldoInicialConsolidado: posicao.total, dataReferencia: HOJE, diasHorizonte: 30 });
const menor30 = menorPontoDaSerie(serie30);
const projetado30 = serie30[serie30.length - 1].saldo;
console.log("Projetado 30 dias (saldo final):", fmt(projetado30), "(sem faixa-alvo)");
console.log("Menor ponto projetado 30d:", fmt(menor30.saldo), "em", menor30.data);

console.log("\n=== AP/AR EM ABERTO ===");
const agingAR = calcularCarteiraEAging(demoLancamentos.filter((l) => l.tipo === "Entrada" && !l.transferencia), HOJE);
const agingAP = calcularCarteiraEAging(demoLancamentos.filter((l) => l.tipo === "Saída" && !l.transferencia), HOJE);
console.log("AR total em aberto:", fmt(agingAR.totalCarteira), "| vencido:", fmt(agingAR.totalVencido),
  agingAR.totalCarteira >= AR_ABERTO_MIN && agingAR.totalCarteira <= AR_ABERTO_MAX ? `OK (${fmt(AR_ABERTO_MIN)}-${fmt(AR_ABERTO_MAX)})` : "FORA DA FAIXA");
console.log("AP total em aberto:", fmt(agingAP.totalCarteira), "| vencido:", fmt(agingAP.totalVencido),
  agingAP.totalCarteira >= AP_ABERTO_MIN && agingAP.totalCarteira <= AP_ABERTO_MAX ? `OK (${fmt(AP_ABERTO_MIN)}-${fmt(AP_ABERTO_MAX)})` : "FORA DA FAIXA");

const liquidez = calcularIndiceLiquidezCaixa(posicao.disponivel, agingAP.totalCarteira);
console.log("Índice de Liquidez de Caixa:", liquidez.toFixed(2) + "x", "(sem faixa-alvo — decorre de Caixa Disponível, que também não tem mais faixa-alvo)");

function mixVencimento(abertos, label) {
  let antecipado = 0, emDia = 0, atrasado = 0;
  abertos.forEach((l) => {
    const diasAteVencer = diffDaysISO(HOJE, l.dataVencimento); // vencimento - hoje
    if (diasAteVencer >= 3) antecipado += l.valor;
    else if (diasAteVencer >= -2) emDia += l.valor;
    else atrasado += l.valor;
  });
  const total = antecipado + emDia + atrasado;
  console.log(`${label}: Antecipado ${(antecipado / total * 100).toFixed(0)}% / Em dia ${(emDia / total * 100).toFixed(0)}% / Atrasado ${(atrasado / total * 100).toFixed(0)}%  (total=${fmt(total)})`);
}
mixVencimento(agingAR.abertos, "AR");
mixVencimento(agingAP.abertos, "AP");
mixVencimento([...agingAR.abertos, ...agingAP.abertos], "AR+AP combinado");

console.log("\n=== DRE — receita mensal (últimos 12 meses) ===");
for (let i = 11; i >= 0; i--) {
  const refMes = addDaysISO(HOJE, -30 * i);
  const [ano, mes] = refMes.split("-").map(Number);
  const ini = startOfMonthISO(ano, mes - 1), fim = endOfMonthISO(ano, mes - 1);
  const doMes = demoLancamentos.filter((l) => !l.transferencia && l.situacao === "Realizado" && l.dataPagamento >= ini && l.dataPagamento <= fim);
  const dre = calcularDRE(doMes, demoPlanoDeContas);
  console.log(`${ini.slice(0, 7)}: Receita Bruta ${fmt(dre.receitaBruta)} | EBITDA ${fmt(dre.ebitda)}`);
}

console.log("\n=== EBITDA no ano (YTD, só Realizado — mesmo filtro de resumoExecutivo.js) ===");
const anoRefYTD = Number(HOJE.slice(0, 4)), mesAtualIdx = Number(HOJE.slice(5, 7)) - 1;
const lancamentosYTD = demoLancamentos.filter((l) => {
  if (!l.dataPagamento || l.situacao !== "Realizado") return false;
  const [ano, mes] = l.dataPagamento.split("-").map(Number);
  return ano === anoRefYTD && (mes - 1) <= mesAtualIdx;
});
const dreYTD = calcularDRE(lancamentosYTD, demoPlanoDeContas);
const margemEbitda = dreYTD.receitaBruta > 0 ? (dreYTD.ebitda / dreYTD.receitaBruta) * 100 : null;
console.log("Receita Bruta no ano:", fmt(dreYTD.receitaBruta));
console.log("EBITDA no ano:", fmt(dreYTD.ebitda), "| margem:", margemEbitda == null ? "—" : margemEbitda.toFixed(1) + "%",
  margemEbitda != null && margemEbitda >= EBITDA_MARGEM_MIN && margemEbitda <= EBITDA_MARGEM_MAX ? `OK (${EBITDA_MARGEM_MIN}%-${EBITDA_MARGEM_MAX}% da Receita Bruta)` : "FORA DA FAIXA");

console.log("\n=== DFC do mês corrente (Waterfall) ===");
const anoRef = Number(HOJE.slice(0, 4)), mesRef = Number(HOJE.slice(5, 7)) - 1;
const inicioMes = startOfMonthISO(anoRef, mesRef), fimMes = endOfMonthISO(anoRef, mesRef);
const caixaInicioMes = calcularPosicaoConsolidada(demoContasBancarias.filter((c) => c.ativo), demoLancamentos, addDaysISO(inicioMes, -1)).total;
const lancDoMes = demoLancamentos.filter((l) => l.dataPagamento && l.dataPagamento >= inicioMes && l.dataPagamento <= fimMes);
const dfc = calcularDFC({ lancamentosNoPeriodo: lancDoMes, planoDeContas: demoPlanoDeContas, caixaInicial: caixaInicioMes });
console.log("Caixa Inicial:", fmt(dfc.caixaInicial), "| FCO:", fmt(dfc.Operacional), "| FCI:", fmt(dfc.Investimento), "| FCF:", fmt(dfc.Financiamento), "| Caixa Final:", fmt(dfc.caixaFinal));

console.log("\n=== Orçado x Realizado (ano corrente, todos os meses) ===");
const arvore = construirOrcadoRealizado({ planoDeContas: demoPlanoDeContas, orcamentoItens: demoOrcamentoItens, lancamentos: demoLancamentos, ano: anoRef, meses: Array.from({ length: 12 }, (_, i) => i), empresaId: "TODAS", centroCustoId: "TODAS", dataReferencia: HOJE });
console.log("Total itens de orçamento:", demoOrcamentoItens.length);
function achatar(nos, nivel = 0) { return nos.flatMap((n) => [{ ...n, nivel }, ...achatar(n.filhos, nivel + 1)]); }
achatar(arvore).filter((n) => n.temOrcamento).forEach((n) => {
  console.log(`  ${"  ".repeat(n.nivel)}${n.codigo} ${n.descricao}: Real=${fmt(n.real)} Orçado=${fmt(n.orcado)} Forecast=${fmt(n.forecast)} Δ%=${n.deltaForecastPct == null ? "não comparável" : n.deltaForecastPct.toFixed(0) + "%"}`);
});

console.log("\n=== Clientes/Fornecedores ===");
console.log("Clientes:", demoClientes.length, "| Fornecedores:", demoFornecedores.length);
