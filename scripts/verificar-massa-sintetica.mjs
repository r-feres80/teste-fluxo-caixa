// Verificação da massa de dados (Bloco B, Etapa 1 + Leva 3 dado real) — roda
// os mesmos cálculos reais do app (financial-engine, nunca uma versão
// paralela) sobre o dataset, e imprime os números que importam pra
// calibração: Caixa/Projetado 30d, AP/AR em aberto, Liquidez, EBITDA (todos
// critério de aceite), mix de vencimento, receita mensal do DRE e Orçado x
// Realizado. Nunca ajuste um número aqui — ajuste o parâmetro de entrada em
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
import { calcularSweepCaixa } from "../src/financial-engine/sweepCaixa.js";
import { todayISO, diffDaysISO, startOfMonthISO, endOfMonthISO, addDaysISO } from "../src/utils/dateUtils.js";

// Faixas-alvo — Comando consolidado, Bloco 1 (Liquidez 1,5x-1,9x + EBITDA
// 10-15% simultâneos, zero saldo negativo): as duas rodadas anteriores
// (fator único, depois otimização por empresa) mostraram que regenerar só
// Custos/Despesas Operacionais Realizado NUNCA traria a Liquidez pra
// 1,5x-1,9x — quem inflava o Caixa Disponível (~R$2,46M, Liquidez 5,80x) era
// o pool de Receitas Financeiras Realizado (Aplicações Financeiras +
// Captações + Recuperação de Créditos, pc4.04/4.05/4.06), R$3,15M, 80% do
// tamanho da própria Receita Bruta — mesmo tipo de valor de teste
// desproporcional já visto nos Custos, só que do lado de Entrada. Decisão do
// usuário: ampliar o escopo da regeneração pra esse pool também (Custos/
// Despesas ficaram como estavam — EBITDA já batia 12,5%, dentro da faixa).
// Caixa Disponível volta a ter faixa-alvo, agora DERIVADA da Liquidez-alvo
// (Disponível = Liquidez × AP em aberto): 1,5x×425k a 1,9x×425k.
const AP_ABERTO_MIN = 380000, AP_ABERTO_MAX = 470000;
const AR_ABERTO_MIN = 550000, AR_ABERTO_MAX = 660000;
const EBITDA_MARGEM_MIN = 10, EBITDA_MARGEM_MAX = 15;
const LIQUIDEZ_MIN = 1.5, LIQUIDEZ_MAX = 1.9;
const CAIXA_DISPONIVEL_MIN = 637500, CAIXA_DISPONIVEL_MAX = 807500; // = Liquidez-alvo × AP ~425k

const HOJE = todayISO();
const fmt = (n) => "R$ " + Math.round(n).toLocaleString("pt-BR");

// ═══════════════════════════════════════════════════════════════════════
// === Invariantes de calibração (não pode ter revertido) ===
// Comando "restaurar-e-prevenir" (Grupo 3): checa se calibrações já
// validadas foram silenciosamente revertidas por algum script rodado
// depois. Nasceu de um caso real (commit b40012d): um script de
// recalibração de inadimplência reclassificou dataPagamento de forma
// ampla demais e, como efeito colateral não previsto, derrubou o dia
// 10/08 da "Composição do Recebimento" e zerou parte do "Previsto p/
// hoje" — ninguém percebeu antes do commit porque só o Bloco 1 agregado
// era checado, nunca a distribuição dia a dia.
//
// Atualize os valores-alvo abaixo sempre que uma NOVA calibração
// legítima mudar o número esperado (ex.: depois de rodar o sweep do
// Grupo 2, DISPONIVEL_ESPERADO cai de ~R$66.101 pra ~R$10.000) — nunca
// ignore um "REGRESSÃO DETECTADA" sem antes confirmar se é essa mudança
// pretendida ou uma perda de verdade.
const DISPONIVEL_ESPERADO = 66100.96; // pós-restauração deste comando; cai pra ~10.000 depois do sweep (Grupo 2) — atualize aqui quando isso acontecer
const DISPONIVEL_TOLERANCIA = 1000;
const APERTO_IMPOSTOS_ESPERADO = 149503.00; // Impostos 20/08 (cenário de aperto de tesouraria)
const APERTO_FOLHA_ESPERADO = 351342.00; // Folha 31/08 (cenário de aperto de tesouraria)
const GERADO_MIN_COUNT = 3; // lançamentos "Gerado —" (preenchimento de gap) conhecidos até este comando

{
  const invariantes = [];
  const posicaoInv = calcularPosicaoConsolidada(demoContasBancarias.filter((c) => c.ativo), demoLancamentos, HOJE);
  if (Math.abs(posicaoInv.disponivel - DISPONIVEL_ESPERADO) > DISPONIVEL_TOLERANCIA) {
    invariantes.push(`Saldo Disponível calculado: esperado ~${fmt(DISPONIVEL_ESPERADO)}, encontrado ${fmt(posicaoInv.disponivel)}`);
  }

  const impostosAperto = demoLancamentos.filter((l) => l.documento && l.documento.startsWith("IMP-202608-"));
  const totalImpostosAperto = impostosAperto.reduce((s, l) => s + l.valor, 0);
  if (Math.abs(totalImpostosAperto - APERTO_IMPOSTOS_ESPERADO) > 1) {
    invariantes.push(`Cenário de aperto — Impostos 20/08: esperado ${fmt(APERTO_IMPOSTOS_ESPERADO)}, encontrado ${fmt(totalImpostosAperto)} (${impostosAperto.length} lançamento(s))`);
  }
  const folhaAperto = demoLancamentos.filter((l) => l.documento && l.documento.startsWith("FOLHA-202608-"));
  const totalFolhaAperto = folhaAperto.reduce((s, l) => s + l.valor, 0);
  if (Math.abs(totalFolhaAperto - APERTO_FOLHA_ESPERADO) > 1) {
    invariantes.push(`Cenário de aperto — Folha 31/08: esperado ${fmt(APERTO_FOLHA_ESPERADO)}, encontrado ${fmt(totalFolhaAperto)} (${folhaAperto.length} lançamento(s))`);
  }

  const gerados = demoLancamentos.filter((l) => l.observacao && l.observacao.startsWith("Gerado — "));
  if (gerados.length < GERADO_MIN_COUNT) {
    invariantes.push(`Lançamentos "Gerado —" (preenchimento de gap): esperado >= ${GERADO_MIN_COUNT}, encontrado ${gerados.length}`);
  }

  // Checagem extra (além do que o comando pediu, mas é literalmente o que
  // teria pego a regressão real do b40012d): nenhum dia ÚTIL dentro da
  // janela de 30 dias da Composição do Recebimento pode estar com R$0 de
  // recebimento Realizado por empresa. Exceto os 2 dias mais recentes
  // (hoje e ontem) — hoje fica vazio de propósito (defasagem de
  // confirmação bancária) e, como "hoje" avança com o relógio real, ontem
  // é sempre o "hoje" de calibrações anteriores que nunca foi
  // retroativamente liquidado (o dataset não simula esse catch-up) —
  // achado desta própria rodada, não é regressão, é um rastro esperado da
  // janela andando. Um catch-up automático de "ontem" seria um bom
  // complemento futuro do sweep do Grupo 2, mas não foi pedido nesta
  // rodada.
  const isDiaUtil = (iso) => { const dow = new Date(iso + "T00:00:00Z").getUTCDay(); return dow !== 0 && dow !== 6; };
  const janelaInicio = addDaysISO(HOJE, -29);
  const ontem = addDaysISO(HOJE, -1);
  const empresasComContas = [...new Set(demoContasBancarias.map((c) => c.empresaId))];
  for (const empresaId of empresasComContas) {
    const arRealizados = demoLancamentos.filter((l) => l.tipo === "Entrada" && !l.transferencia && l.situacao === "Realizado" && l.empresaId === empresaId);
    for (let d = janelaInicio; d <= HOJE; d = addDaysISO(d, 1)) {
      if (d === HOJE || d === ontem || !isDiaUtil(d)) continue;
      const total = arRealizados.filter((l) => l.dataPagamento === d).reduce((s, l) => s + l.valor, 0);
      if (total === 0) invariantes.push(`Composição do Recebimento — dia útil ${d} sem NENHUM recebimento Realizado pra empresa ${empresaId} (esperado: todo dia útil que não seja hoje tem dado)`);
    }
  }

  // Comando sweep-automatico-b, item 5 ("nenhuma execução de sweep deve
  // ter data duplicada no log"): o log real (entidades.sweepLog) é estado
  // de runtime do navegador (localStorage), não existe nos arquivos
  // estáticos que este script Node lê — não dá pra inspecionar o log ao
  // vivo daqui. A proteção contra duplicidade em si mora em
  // useAppData.js (checagem "já rodou hoje?" antes de disparar), testada
  // de verdade via simulação de 2 dias no navegador (Playwright +
  // page.clock), não aqui. O que ESTE script consegue e deve garantir é
  // a pureza/determinismo do cálculo que alimenta o sweep — mesmo input,
  // mesmo output, sem mutação escondida — e a ausência de "movimentos
  // fantasma" de valor zero (bug real encontrado e corrigido nesta
  // rodada: resíduo de ponto flutuante fazia o loop empurrar 3
  // transferências de R$0,00 pro log).
  const sweepA = calcularSweepCaixa({ contasBancarias: demoContasBancarias, lancamentos: demoLancamentos, hoje: HOJE, caixaMinimo: 10000 });
  const sweepB = calcularSweepCaixa({ contasBancarias: demoContasBancarias, lancamentos: demoLancamentos, hoje: HOJE, caixaMinimo: 10000 });
  if (JSON.stringify(sweepA) !== JSON.stringify(sweepB)) {
    invariantes.push("calcularSweepCaixa não é determinístico: 2 chamadas com o mesmo input produziram resultados diferentes");
  }
  const movimentoZerado = sweepA.movimentos.find((m) => m.valor <= 0);
  if (movimentoZerado) {
    invariantes.push(`calcularSweepCaixa produziu um movimento de valor <= 0 (${fmt(movimentoZerado.valor)}, conta ${movimentoZerado.contaOrigemId}) — voltou o bug de resíduo de ponto flutuante`);
  }

  if (invariantes.length > 0) {
    console.log("⚠️⚠️⚠️ REGRESSÃO DETECTADA ⚠️⚠️⚠️");
    invariantes.forEach((msg) => console.log("  ⚠️ " + msg));
    console.log("⚠️⚠️⚠️ Confirme se é a mudança pretendida deste comando específico antes de commitar — não commite torcendo pra estar certo. ⚠️⚠️⚠️\n");
  } else {
    console.log("=== Invariantes de calibração: OK, nada revertido silenciosamente ===\n");
  }
}
// ═══════════════════════════════════════════════════════════════════════

console.log("=== VOLUME ===");
console.log("Total lançamentos:", demoLancamentos.length);
console.log("Data de referência (HOJE):", HOJE);

console.log("\n=== CAIXA (Tesouraria/Dashboard) ===");
const posicao = calcularPosicaoConsolidada(demoContasBancarias.filter((c) => c.ativo), demoLancamentos, HOJE);
console.log("Total consolidado:", fmt(posicao.total));
console.log("Aplicações (sem liquidez):", fmt(posicao.aplicacoes));
console.log("Disponível:", fmt(posicao.disponivel),
  posicao.disponivel >= CAIXA_DISPONIVEL_MIN && posicao.disponivel <= CAIXA_DISPONIVEL_MAX ? `OK (${fmt(CAIXA_DISPONIVEL_MIN)}-${fmt(CAIXA_DISPONIVEL_MAX)})` : "FORA DA FAIXA");
console.log("Nenhum saldoInicial negativo:", demoContasBancarias.every((c) => c.saldoInicial >= 0) ? "OK" : "FALHOU");
demoContasBancarias.forEach((c) => console.log(`  ${c.id} (${c.empresaId}, ${c.semLiquidez === "true" ? "aplicação" : "líquida"}): saldoInicial=${fmt(c.saldoInicial)}`));

// Comando caixa-projetado-fix: "Projetado 30 dias" (card do Dashboard) parte
// do Caixa Disponível, não do Total Consolidado — mesma definição do DFC.
const serie30 = buildFluxoCaixaDiario({ lancamentos: demoLancamentos, saldoInicialConsolidado: posicao.disponivel, dataReferencia: HOJE, diasHorizonte: 30 });
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
console.log("Índice de Liquidez de Caixa:", liquidez.toFixed(2) + "x",
  liquidez >= LIQUIDEZ_MIN && liquidez <= LIQUIDEZ_MAX ? `OK (${LIQUIDEZ_MIN}x-${LIQUIDEZ_MAX}x)` : "FORA DA FAIXA");

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
// Comando DFC-caixa-real: "caixa" do DFC é o Disponível (líquido), não mais
// o Total Consolidado — aplicação financeira é uso de caixa, não caixa em si.
const contasAtivas = demoContasBancarias.filter((c) => c.ativo);
const caixaInicioMes = calcularPosicaoConsolidada(contasAtivas, demoLancamentos, addDaysISO(inicioMes, -1)).disponivel;
const lancDoMes = demoLancamentos.filter((l) => l.dataPagamento && l.dataPagamento >= inicioMes && l.dataPagamento <= fimMes);
const dfc = calcularDFC({ lancamentosNoPeriodo: lancDoMes, planoDeContas: demoPlanoDeContas, contasBancarias: contasAtivas, caixaInicial: caixaInicioMes });
console.log("Caixa Inicial:", fmt(dfc.caixaInicial), "| FCO:", fmt(dfc.Operacional), "| FCI:", fmt(dfc.Investimento), "| FCF:", fmt(dfc.Financiamento), "| Caixa Final:", fmt(dfc.caixaFinal));
const disponivelFimMes = calcularPosicaoConsolidada(contasAtivas, demoLancamentos, fimMes).disponivel;
console.log("Caixa Disponível real (Tesouraria) no fim do mês:", fmt(disponivelFimMes), Math.abs(dfc.caixaFinal - disponivelFimMes) < 0.01 ? "OK (bate com o Caixa Final do DFC)" : "NÃO BATE");

console.log("\n=== Orçado x Realizado (ano corrente, todos os meses) ===");
const arvore = construirOrcadoRealizado({ planoDeContas: demoPlanoDeContas, orcamentoItens: demoOrcamentoItens, lancamentos: demoLancamentos, ano: anoRef, meses: Array.from({ length: 12 }, (_, i) => i), empresaId: "TODAS", centroCustoId: "TODAS", dataReferencia: HOJE });
console.log("Total itens de orçamento:", demoOrcamentoItens.length);
function achatar(nos, nivel = 0) { return nos.flatMap((n) => [{ ...n, nivel }, ...achatar(n.filhos, nivel + 1)]); }
achatar(arvore).filter((n) => n.temOrcamento).forEach((n) => {
  console.log(`  ${"  ".repeat(n.nivel)}${n.codigo} ${n.descricao}: Real=${fmt(n.real)} Orçado=${fmt(n.orcado)} Forecast=${fmt(n.forecast)} Δ%=${n.deltaForecastPct == null ? "não comparável" : n.deltaForecastPct.toFixed(0) + "%"}`);
});

console.log("\n=== Clientes/Fornecedores ===");
console.log("Clientes:", demoClientes.length, "| Fornecedores:", demoFornecedores.length);
