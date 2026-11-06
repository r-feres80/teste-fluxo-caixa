// Variação percentual segura contra base (ex.: Orçado) perto de zero —
// usada em toda comparação Real/Forecast x Orçado do app (Orçado x
// Realizado, DFC do Período, Alertas Executivos). Sem isso, uma conta com
// orçado de R$ 10 e um pequeno desvio real gera um "%" tecnicamente correto
// mas sem sentido nenhum pra decisão (ex.: -1729%). Abaixo do limiar, quem
// chama deve tratar como "não comparável" — nunca formatar null como número.
export function calcularVariacaoPct(delta, base, limiarBase = 500) {
  if (Math.abs(base) < limiarBase) return null;
  return (delta / Math.abs(base)) * 100;
}
