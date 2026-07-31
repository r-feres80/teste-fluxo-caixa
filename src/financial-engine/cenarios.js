/**
 * Cenários aplicam % definidos pelo usuário sobre os componentes do Forecast.
 * Com todas as premissas em 0%, o cenário é idêntico ao Forecast (Base).
 * Nunca inventamos taxa — o motor só multiplica o que o usuário configurou.
 */
export function aplicarPremissasDRE(dreForecast, premissas) {
  const receitaBruta = dreForecast.receitaBruta * (1 + premissas.receitaPct / 100);
  const deducoes = dreForecast.deducoes * (1 + premissas.receitaPct / 100); // deduções acompanham a receita
  const receitaLiquida = receitaBruta + deducoes;
  const custos = dreForecast.custos * (1 + premissas.custosPct / 100);
  const margemBruta = receitaLiquida + custos;
  const despesasTotais = dreForecast.despesasPessoal + dreForecast.despesasAdministrativas + dreForecast.despesasComerciais + dreForecast.outrasDespesasOperacionais;
  const despesasAjustadas = despesasTotais * (1 + premissas.despesasPct / 100);
  const ebitda = margemBruta + despesasAjustadas;
  const resultadoFinanceiro = dreForecast.resultadoFinanceiro;
  const resultadoGerencial = ebitda + resultadoFinanceiro;
  return { receitaBruta, deducoes, receitaLiquida, custos, margemBruta, despesasAjustadas, ebitda, resultadoFinanceiro, resultadoGerencial };
}

/** Impacto sobre o caixa: aplica os mesmos percentuais sobre recebíveis/pagáveis ainda em aberto no período. */
export function aplicarPremissasCaixa({ caixaProjetadoBase, menorProjetadoBase, recebiveisEmAberto, pagaveisEmAberto }, premissas) {
  const impactoRecebimentos = -(premissas.percNaoRecebimento / 100) * recebiveisEmAberto;
  const impactoPagamentos = (premissas.percAtrasoPagamento / 100) * pagaveisEmAberto;
  const impactoTotal = impactoRecebimentos + impactoPagamentos;
  return {
    caixaProjetado: caixaProjetadoBase + impactoTotal,
    menorProjetado: menorProjetadoBase + impactoTotal,
  };
}

export const PREMISSAS_BASE = { receitaPct: 0, custosPct: 0, despesasPct: 0, percNaoRecebimento: 0, percAtrasoPagamento: 0 };
