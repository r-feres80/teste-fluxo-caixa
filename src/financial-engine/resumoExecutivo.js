// Resumo Executivo — fonte única de indicadores consumida pelo Dashboard e pelo Finance Copilot (IA).
// Mantém o "modelo canônico": os mesmos números, calculados uma única vez, alimentam tanto a
// visualização quanto a interpretação da IA — nunca a IA recalcula por conta própria.

import { parseISO, getDataAtualSistema } from "../utils/dateUtils.js";
import { calcularPosicaoConsolidada } from "./tesouraria.js";
import { buildFluxoCaixaDiario, menorPontoDaSerie } from "./fluxoCaixa.js";
import { calcularCarteiraEAging, calcularConcentracaoPorParceiro, vencimentosProximos } from "./aging.js";
import { calcularDRE } from "./dre.js";
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

  const posicao = calcularPosicaoConsolidada(contasFiltradas, lancamentosFiltrados, dataReferencia);
  const serie30 = buildFluxoCaixaDiario({
    lancamentos: lancamentosFiltrados, saldoInicialConsolidado: posicao.total,
    dataReferencia, diasHorizonte: 30,
  });
  const menor30 = menorPontoDaSerie(serie30);
  const caixaProjetado30 = serie30[serie30.length - 1]?.saldo ?? posicao.total;

  const agingAR = calcularCarteiraEAging(lancamentosFiltrados.filter((l) => l.tipo === "Entrada" && !l.transferencia), dataReferencia);
  const agingAP = calcularCarteiraEAging(lancamentosFiltrados.filter((l) => l.tipo === "Saída" && !l.transferencia), dataReferencia);
  const concentracaoClientes = calcularConcentracaoPorParceiro(agingAR.abertos, 5);
  const concentracaoFornecedores = calcularConcentracaoPorParceiro(agingAP.abertos, 5);
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
  const desviosOrcamentarios = achatarOrcado(arvoreMes).filter((n) => n.temOrcamento);
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
    caixaConsolidado: posicao.total, menorProjetado: menor30, parametros, agingAR, agingAP,
    concentracaoClientes, concentracaoFornecedores, desviosOrcamentarios, vencimentosProximosAP: vencAP, vencimentosProximosAR: vencAR,
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
      concentracaoTop5: topFornecedores,
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
    alertas,
  };
}
