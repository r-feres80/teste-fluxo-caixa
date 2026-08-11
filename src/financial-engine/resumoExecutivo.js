// Resumo Executivo — fonte única de indicadores consumida pelo Dashboard e pelo Finance Copilot (IA).
// Mantém o "modelo canônico": os mesmos números, calculados uma única vez, alimentam tanto a
// visualização quanto a interpretação da IA — nunca a IA recalcula por conta própria.

import { parseISO, getDataAtualSistema, startOfMonthISO, endOfMonthISO, addDaysISO } from "../utils/dateUtils.js";
import { calcularPosicaoConsolidada } from "./tesouraria.js";
import { buildFluxoCaixaDiario, menorPontoDaSerie } from "./fluxoCaixa.js";
import { calcularCarteiraEAging, calcularConcentracaoPorParceiro, calcularDespesasInternas, vencimentosProximos } from "./aging.js";
import { calcularIndiceLiquidezCaixa, calcularIndiceLiquidezTotal } from "./indicadoresCaixa.js";
import { calcularDRE } from "./dre.js";
import { calcularDFC } from "./dfc.js";
import { excluirTransferencias } from "./lancamentos.js";
import { construirOrcadoRealizado } from "./orcadoRealizado.js";
import { calcularAlertasExecutivos } from "./alertas.js";

function achatarOrcado(nos) {
  return nos.flatMap((n) => [
    { descricao: n.descricao, deltaForecast: n.deltaForecast, deltaForecastPct: n.deltaForecastPct, temOrcamento: n.temOrcamento },
    ...achatarOrcado(n.filhos),
  ]);
}

/**
 * Constrói o resumo executivo consolidado a partir dos dados já filtrados.
 * Este é o ÚNICO lugar onde esses indicadores são calculados; Dashboard e
 * Finance Copilot (IA) devem sempre consumir a saída desta função, nunca
 * recalcular por conta própria — isso garante que a IA nunca explique um
 * número diferente do que está na tela.
 */
export function construirResumoExecutivo({ entidades, filtros, parametros }) {
  // Dashboard/Copilot são módulos de FATO: a data nunca vem de filtros
  // (editável), sempre da data real do sistema — ver getDataAtualSistema.
  const dataReferencia = getDataAtualSistema();
  const hoje = parseISO(dataReferencia);
  const anoRef = hoje.getFullYear();
  const mesesYTD = Array.from({ length: hoje.getMonth() + 1 }, (_, i) => i);

  const contasFiltradas = entidades.contasBancarias.filter(
    (c) => c.ativo && (filtros.empresaId === "TODAS" || c.empresaId === filtros.empresaId)
  );
  const lancamentosFiltrados = entidades.lancamentos.filter(
    (l) => filtros.empresaId === "TODAS" || l.empresaId === filtros.empresaId
  );

  // Comando DFC-caixa-real / caixa-projetado-fix: a projeção de 30 dias
  // (card "Caixa Projetado 30 dias" no Dashboard) parte do Caixa Disponível
  // (líquido), não do Total Consolidado — mesma definição de "caixa" usada
  // no DFC/Fluxo de Caixa, senão o card fica ~R$ 200k acima do "Caixa
  // Disponível" ao lado sem nenhuma explicação (aplicação financeira não é
  // caixa disponível pra projetar).
  const posicao = calcularPosicaoConsolidada(contasFiltradas, lancamentosFiltrados, dataReferencia);
  const serie30 = buildFluxoCaixaDiario({
    lancamentos: lancamentosFiltrados, saldoInicialConsolidado: posicao.disponivel,
    dataReferencia, diasHorizonte: 30,
  });
  const menor30 = menorPontoDaSerie(serie30);
  const caixaProjetado30 = serie30[serie30.length - 1]?.saldo ?? posicao.disponivel;

  // DFC do mês corrente, para o waterfall executivo — mesmo cálculo/período
  // do DFC Gerencial (calcularDFC), nunca duplicado com lógica própria.
  // Comando DFC-caixa-real: caixaInicial é o Caixa Disponível (líquido), não
  // o Total Consolidado — aplicação financeira é uso de caixa, não caixa em
  // si (mesma definição usada em toda a tela DFC/Fluxo de Caixa).
  const inicioMes = startOfMonthISO(anoRef, hoje.getMonth());
  const fimMes = endOfMonthISO(anoRef, hoje.getMonth());
  const caixaInicioMes = calcularPosicaoConsolidada(contasFiltradas, lancamentosFiltrados, addDaysISO(inicioMes, -1)).disponivel;
  const lancamentosDoMes = lancamentosFiltrados.filter((l) => l.dataPagamento && l.dataPagamento >= inicioMes && l.dataPagamento <= fimMes);
  const dfcMesAtual = calcularDFC({ lancamentosNoPeriodo: lancamentosDoMes, planoDeContas: entidades.planoDeContas, contasBancarias: contasFiltradas, caixaInicial: caixaInicioMes });

  const agingAR = calcularCarteiraEAging(lancamentosFiltrados.filter((l) => l.tipo === "Entrada" && !l.transferencia), dataReferencia);
  const agingAP = calcularCarteiraEAging(lancamentosFiltrados.filter((l) => l.tipo === "Saída" && !l.transferencia), dataReferencia);
  const concentracaoClientes = calcularConcentracaoPorParceiro(agingAR.abertos, 5);
  const concentracaoFornecedores = calcularConcentracaoPorParceiro(agingAP.abertos, 5);
  const despesasInternasFornecedores = calcularDespesasInternas(agingAP.abertos);
  const vencAP = vencimentosProximos(agingAP.abertos, dataReferencia, parametros.diasParaAlertas);
  const vencAR = vencimentosProximos(agingAR.abertos, dataReferencia, parametros.diasParaAlertas);

  const lancamentosYTD = excluirTransferencias(lancamentosFiltrados).filter((l) => {
    const [ano, mes] = l.competencia.split("-").map(Number);
    return ano === anoRef && mesesYTD.includes(mes - 1) && l.situacao === "Realizado";
  });
  const dreYTD = calcularDRE(lancamentosYTD, entidades.planoDeContas);

  const arvoreMes = construirOrcadoRealizado({
    planoDeContas: entidades.planoDeContas, orcamentoItens: entidades.orcamentoItens, lancamentos: entidades.lancamentos,
    ano: anoRef, meses: [hoje.getMonth()], empresaId: filtros.empresaId, dataReferencia,
  });
  // Granular (todos os níveis da árvore) — só para o Copilot/"principais
  // desvios" explicar causa-raiz por conta. NUNCA usar pra gerar Alertas
  // Executivos: como cada nó Sintética soma os descendentes, um desvio real
  // cascateia (Grupo + Subgrupo + Conta todos "materiais" ao mesmo tempo) —
  // gerar um alerta por nó da árvore inteira é o que produzia dezenas de
  // linhas quase idênticas no painel de alertas.
  const desviosOrcamentarios = achatarOrcado(arvoreMes).filter((n) => n.temOrcamento);
  // Só os 6 grupos de topo (Receitas/Custos/Despesas Operacionais/Resultado
  // Financeiro/Investimentos/Impostos) — um resumo agregado por grupo já
  // comunica "onde" está o desvio sem repetir linha por subconta.
  const desviosPorGrupo = arvoreMes.filter((n) => n.temOrcamento);
  const desvioTotalVsOrcamento = arvoreMes.reduce((s, n) => s + n.deltaForecast, 0);

  const mapaCC = new Map();
  excluirTransferencias(lancamentosFiltrados)
    .filter((l) => l.tipo === "Saída" && l.situacao === "Realizado" && l.centroCustoId)
    .forEach((l) => mapaCC.set(l.centroCustoId, (mapaCC.get(l.centroCustoId) || 0) + l.valor));
  const despesasPorCC = Array.from(mapaCC.entries())
    .map(([id, valor]) => ({ nome: entidades.centrosCusto.find((c) => c.id === id)?.nome ?? "—", valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);

  const topClientes = concentracaoClientes.map((c) => ({
    ...c, nome: entidades.clientes.find((cl) => cl.id === c.id)?.nome ?? "—",
  }));
  const topFornecedores = concentracaoFornecedores.map((c) => ({
    ...c, nome: entidades.fornecedores.find((f) => f.id === c.id)?.nome ?? "—",
  }));

  const alertas = calcularAlertasExecutivos({
    caixaConsolidado: posicao.disponivel, menorProjetado: menor30, parametros, agingAR, agingAP,
    concentracaoClientes, concentracaoFornecedores, desviosOrcamentarios: desviosPorGrupo, vencimentosProximosAP: vencAP, vencimentosProximosAR: vencAR,
  });

  return {
    dataReferencia,
    empresaFiltro: filtros.empresaId,
    caixa: {
      disponivel: posicao.disponivel,
      totalConsolidado: posicao.total,
      projetado30dias: caixaProjetado30,
      menorPontoProjetado30dias: menor30 ?? null,
      serieDiaria30dias: serie30,
      indiceLiquidezCaixa: calcularIndiceLiquidezCaixa(posicao.disponivel, agingAP.totalCarteira),
      indiceLiquidezTotal: calcularIndiceLiquidezTotal(posicao.disponivel, posicao.aplicacoes, agingAP.totalCarteira),
    },
    contasReceber: {
      totalEmAberto: agingAR.totalCarteira,
      totalVencido: agingAR.totalVencido,
      inadimplenciaPct: agingAR.totalCarteira > 0 ? Number(((agingAR.totalVencido / agingAR.totalCarteira) * 100).toFixed(1)) : 0,
      concentracaoTop5: topClientes,
      vencimentosProximos: vencAR,
    },
    contasPagar: {
      totalEmAberto: agingAP.totalCarteira,
      totalVencido: agingAP.totalVencido,
      atrasoPct: agingAP.totalCarteira > 0 ? Number(((agingAP.totalVencido / agingAP.totalCarteira) * 100).toFixed(1)) : 0,
      concentracaoTop5: topFornecedores,
      despesasInternas: despesasInternasFornecedores,
      vencimentosProximos: vencAP,
    },
    dreYTD: {
      receitaBruta: dreYTD.receitaBruta,
      ebitda: dreYTD.ebitda,
    },
    orcadoRealizado: {
      desvioTotalVsOrcamento,
      previstoTotalPeriodo: arvoreMes.reduce((s, n) => s + n.previsto, 0),
      principaisDesvios: desviosOrcamentarios
        .slice()
        .sort((a, b) => Math.abs(b.deltaForecast) - Math.abs(a.deltaForecast))
        .slice(0, 8),
    },
    despesasPorCentroCusto: despesasPorCC,
    dfcMesAtual,
    alertas,
  };
}
