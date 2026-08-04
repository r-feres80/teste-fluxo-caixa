// Cálculos puros sobre séries de câmbio (BCB SGS) — sem I/O. O fetch e o
// cache ficam em services/cambioService.js; aqui só a matemática.

/**
 * EMA5 (Média Móvel Exponencial de 5 dias) sobre uma série cronológica
 * (mais antigo -> mais novo). k = 2/(N+1), N=5. A primeira EMA é a SMA dos
 * primeiros N valores; os seguintes usam EMA_hoje = valor*k + EMA_ontem*(1-k).
 * Com menos de 5 valores, usa os disponíveis como "amostra reduzida" — nunca
 * lança erro, nunca retorna NaN.
 */
export function calcularEMA5(valoresCronologicos) {
  if (!valoresCronologicos || valoresCronologicos.length === 0) return null;
  const N = 5;
  const k = 2 / (N + 1);
  const n = Math.min(N, valoresCronologicos.length);
  const amostraReduzida = valoresCronologicos.length < N;
  let ema = valoresCronologicos.slice(0, n).reduce((s, v) => s + v, 0) / n;
  for (let i = n; i < valoresCronologicos.length; i++) {
    ema = valoresCronologicos[i] * k + ema * (1 - k);
  }
  return { ema, amostraReduzida, amostraTamanho: valoresCronologicos.length };
}

/**
 * A partir de uma série cronológica [{ data, valor }] (mais antigo -> mais
 * novo) de uma moeda, monta hoje/semana anterior/variação%/EMA5. "Semana
 * anterior" usa 5 pregões atrás (não 7 dias corridos), já que a série do
 * BCB só tem dias úteis.
 */
export function calcularIndicadoresCambio(serieCronologica) {
  if (!serieCronologica || serieCronologica.length === 0) return null;
  const valores = serieCronologica.map((d) => d.valor);
  const hoje = valores[valores.length - 1];
  const idxSemanaAnterior = Math.max(0, valores.length - 1 - 5);
  const semanaAnterior = valores.length > 1 ? valores[idxSemanaAnterior] : null;
  const variacaoPct = semanaAnterior != null && semanaAnterior !== 0 ? ((hoje - semanaAnterior) / semanaAnterior) * 100 : null;
  const ema5 = calcularEMA5(valores);
  return {
    dataHoje: serieCronologica[serieCronologica.length - 1].data,
    hoje, semanaAnterior, variacaoPct,
    ema5: ema5 ? ema5.ema : null,
    ema5AmostraReduzida: ema5 ? ema5.amostraReduzida : false,
    ema5AmostraTamanho: ema5 ? ema5.amostraTamanho : 0,
    // Últimos 5 pregões (mais antigo -> mais recente) — mesma série já
    // buscada para o EMA5, sem nova chamada à API. "Desliza" sozinha: a
    // cada novo pregão que entra na série, o slice(-5) automaticamente
    // deixa o mais antigo de fora.
    ultimosDias: serieCronologica.slice(-5),
  };
}
