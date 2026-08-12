// Cálculo puro do sweep de caixa (varredura de saldo líquido acima do
// mínimo operacional para Aplicação) — usado pelo gatilho de runtime em
// useAppData.js. Mesma regra de negócio de scripts/varredura-caixa-aplicacao.mjs
// (não alterado, fora de escopo do comando sweep-automatico-b): contas
// líquidas com maior saldo primeiro, "conta principal" de Aplicação por
// empresa = menor id numérico cadastrado pra ela.
import { calcularSaldoConta } from "./tesouraria.js";

export function calcularSweepCaixa({ contasBancarias, lancamentos, hoje, caixaMinimo }) {
  const contasLiquidas = contasBancarias.filter((c) => c.ativo && c.semLiquidez !== "true");
  const saldosLiquidos = contasLiquidas
    .map((conta) => ({ conta, saldo: calcularSaldoConta(conta, lancamentos, hoje) }))
    .sort((a, b) => b.saldo - a.saldo);
  const totalLiquido = saldosLiquidos.reduce((s, x) => s + x.saldo, 0);
  const excedenteTotal = totalLiquido - caixaMinimo;

  if (excedenteTotal <= 0) {
    return { executar: false, totalLiquido, excedenteTotal, movimentos: [] };
  }

  const contasAplicacao = contasBancarias.filter((c) => c.ativo && c.semLiquidez === "true");
  const contaPrincipalAplicacao = (empresaId) =>
    contasAplicacao.filter((c) => c.empresaId === empresaId).sort((a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)))[0];

  // Tolerância de meio centavo: soma/subtração de ponto flutuante pode
  // deixar `restante` num resíduo tipo 0.0000000003 em vez de exatamente
  // 0 depois de cobrir o excedente — sem essa tolerância, o loop
  // continuava pras próximas contas e gerava "movimentos fantasma" de
  // R$0,00 (achado real ao testar a simulação de 2 dias desta rodada).
  let restante = excedenteTotal;
  const movimentos = [];
  for (const { conta, saldo } of saldosLiquidos) {
    if (restante <= 0.005) break;
    if (saldo <= 0) continue;
    const destino = contaPrincipalAplicacao(conta.empresaId);
    if (!destino) continue; // empresa sem conta de Aplicação cadastrada — nada a fazer por ela
    const valor = Number(Math.min(saldo, restante).toFixed(2));
    if (valor <= 0) continue;
    movimentos.push({ contaOrigemId: conta.id, contaDestinoId: destino.id, empresaId: conta.empresaId, valor });
    restante -= valor;
  }

  return { executar: movimentos.length > 0, totalLiquido, excedenteTotal, movimentos, restanteNaoVarrido: Math.max(0, restante) };
}
