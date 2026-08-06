export function calcularAlertasExecutivos({
  caixaConsolidado, menorProjetado, parametros, agingAR, agingAP, concentracaoClientes, concentracaoFornecedores,
  desviosOrcamentarios, vencimentosProximosAP, vencimentosProximosAR,
}) {
  const alertas = [];

  if (menorProjetado != null && menorProjetado.saldo < 0) {
    alertas.push({ tipo: "liquidez", severidade: "Alta", saldo: menorProjetado.saldo, data: menorProjetado.data });
  }
  if (parametros.caixaMinimo != null && caixaConsolidado < parametros.caixaMinimo) {
    alertas.push({ tipo: "caixa_abaixo_minimo", severidade: "Alta", valor: caixaConsolidado });
  } else if (parametros.caixaMinimo != null && menorProjetado != null && menorProjetado.saldo < parametros.caixaMinimo) {
    alertas.push({ tipo: "caixa_projetado_abaixo_minimo", severidade: "Média", valor: menorProjetado.saldo, data: menorProjetado.data });
  }
  if (agingAR && agingAR.totalVencido > 0) {
    alertas.push({ tipo: "titulos_vencidos_receber", severidade: "Alta", valor: agingAR.totalVencido });
  }
  if (agingAP && agingAP.totalVencido > 0) {
    alertas.push({ tipo: "titulos_vencidos_pagar", severidade: "Alta", valor: agingAP.totalVencido });
  }
  if (vencimentosProximosAP && vencimentosProximosAP.length > 0) {
    const total = vencimentosProximosAP.reduce((s, l) => s + l.valor, 0);
    alertas.push({ tipo: "pagamentos_proximos", severidade: "Média", valor: total, dias: parametros.diasParaAlertas, qtd: vencimentosProximosAP.length });
  }
  if (vencimentosProximosAR && vencimentosProximosAR.length > 0) {
    const total = vencimentosProximosAR.reduce((s, l) => s + l.valor, 0);
    alertas.push({ tipo: "recebimentos_atraso_relevantes", severidade: "Média", valor: total, qtd: vencimentosProximosAR.length });
  }
  (desviosOrcamentarios || []).forEach((d) => {
    // deltaForecastPct é null quando |orçado| é baixo demais pra comparar em
    // % (ver calcularVariacaoPct) — nesse caso o gatilho de materialidade
    // vale só pelo R$ absoluto, nunca por um "%" sem sentido.
    const materialPorPct = d.deltaForecastPct != null && Math.abs(d.deltaForecastPct) >= parametros.materialidadePct;
    if (materialPorPct || Math.abs(d.deltaForecast) >= parametros.materialidadeValor) {
      alertas.push({ tipo: "desvio_orcamentario", severidade: "Média", nome: d.descricao, valor: d.deltaForecast, pct: d.deltaForecastPct });
    }
  });
  if (concentracaoClientes && concentracaoClientes[0]?.pct >= parametros.limiteConcentracaoPct) {
    alertas.push({ tipo: "concentracao_cliente", severidade: "Média", pct: concentracaoClientes[0].pct, id: concentracaoClientes[0].id });
  }
  if (concentracaoFornecedores && concentracaoFornecedores[0]?.pct >= parametros.limiteConcentracaoPct) {
    alertas.push({ tipo: "concentracao_fornecedor", severidade: "Média", pct: concentracaoFornecedores[0].pct, id: concentracaoFornecedores[0].id });
  }

  return alertas.sort((a, b) => (a.severidade === b.severidade ? 0 : a.severidade === "Alta" ? -1 : 1));
}
