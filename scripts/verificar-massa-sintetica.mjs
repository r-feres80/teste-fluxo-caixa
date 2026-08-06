// Verificação da massa de dados sintética (Bloco B, Etapa 1) — roda os
// mesmos cálculos reais do app (financial-engine, nunca uma versão
// paralela) sobre o dataset gerado, e imprime os números que importam pra
// calibração: Caixa Disponível/Projetado 30d, AP/AR em aberto, mix de
// vencimento, receita mensal do DRE e Orçado x Realizado. Use pra recalibrar
// src/data/demoDataGenerator.js sempre que os parâmetros de geração
// mudarem — nunca ajuste um número aqui, ajuste o parâmetro de entrada lá.
//
// Rodar: node scripts/verificar-massa-sintetica.mjs
import { demoLancamentos, demoOrcamentoItens, demoContasBancarias, demoPlanoDeContas, demoClientes, demoFornecedores } from "../src/data/demoData.js";
import { calcularPosicaoConsolidada } from "../src/financial-engine/tesouraria.js";
import { buildFluxoCaixaDiario, menorPontoDaSerie } from "../src/financial-engine/fluxoCaixa.js";
import { calcularCarteiraEAging } from "../src/financial-engine/aging.js";
import { calcularDRE } from "../src/financial-engine/dre.js";
import { calcularDFC } from "../src/financial-engine/dfc.js";
import { construirOrcadoRealizado } from "../src/financial-engine/orcadoRealizado.js";
import { todayISO, diffDaysISO, startOfMonthISO, endOfMonthISO, addDaysISO } from "../src/utils/dateUtils.js";

const HOJE = todayISO();
const fmt = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");

console.log("=== VOLUME ===");
console.log("Total lançamentos:", demoLancamentos.length);
console.log("Data de referência (HOJE):", HOJE);

console.log("\n=== CAIXA (Tesouraria/Dashboard) ===");
const posicao = calcularPosicaoConsolidada(demoContasBancarias.filter((c) => c.ativo), demoLancamentos, HOJE);
console.log("Total consolidado:", fmt(posicao.total));
console.log("Aplicações (sem liquidez):", fmt(posicao.aplicacoes));
console.log("Disponível:", fmt(posicao.disponivel), posicao.disponivel >= 600000 && posicao.disponivel <= 850000 ? "OK (600-850k)" : "FORA DA FAIXA");
demoContasBancarias.forEach((c) => console.log(`  ${c.id} (${c.semLiquidez === "true" ? "aplicação" : "líquida"}): saldoInicial=${fmt(c.saldoInicial)}`));

const serie30 = buildFluxoCaixaDiario({ lancamentos: demoLancamentos, saldoInicialConsolidado: posicao.total, dataReferencia: HOJE, diasHorizonte: 30 });
const menor30 = menorPontoDaSerie(serie30);
const projetado30 = serie30[serie30.length - 1].saldo;
console.log("Projetado 30 dias (saldo final):", fmt(projetado30), projetado30 >= 600000 && projetado30 <= 850000 ? "OK (600-850k)" : "FORA DA FAIXA");
console.log("Menor ponto projetado 30d:", fmt(menor30.saldo), "em", menor30.data);

console.log("\n=== AP/AR EM ABERTO ===");
const agingAR = calcularCarteiraEAging(demoLancamentos.filter((l) => l.tipo === "Entrada" && !l.transferencia), HOJE);
const agingAP = calcularCarteiraEAging(demoLancamentos.filter((l) => l.tipo === "Saída" && !l.transferencia), HOJE);
console.log("AR total em aberto:", fmt(agingAR.totalCarteira), "| vencido:", fmt(agingAR.totalVencido));
console.log("AP total em aberto:", fmt(agingAP.totalCarteira), "| vencido:", fmt(agingAP.totalVencido));

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
  console.log(`  ${"  ".repeat(n.nivel)}${n.codigo} ${n.descricao}: Real=${fmt(n.real)} Orçado=${fmt(n.orcado)} Forecast=${fmt(n.forecast)} Δ%=${n.deltaForecastPct.toFixed(0)}%`);
});

console.log("\n=== Clientes/Fornecedores ===");
console.log("Clientes:", demoClientes.length, "| Fornecedores:", demoFornecedores.length);
