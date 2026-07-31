import { diffDaysISO } from "../utils/dateUtils.js";
import { situacaoEfetiva } from "./lancamentos.js";

/**
 * Recebe lançamentos já filtrados por tipo (Entrada p/ AR, Saída p/ AP) e
 * calcula a carteira em aberto (Previsto/Em aberto/Vencido) com aging.
 */
export function calcularCarteiraEAging(lancamentos, dataReferencia) {
  const abertos = lancamentos.filter((l) => {
    const sit = situacaoEfetiva(l, dataReferencia);
    return sit === "Previsto" || sit === "Em aberto" || sit === "Vencido";
  });

  const buckets = { vencido1a30: 0, vencido31a60: 0, vencido61a90: 0, vencidoMais90: 0, aVencer: 0 };
  let totalVencido = 0;

  abertos.forEach((l) => {
    const dias = diffDaysISO(l.dataVencimento, dataReferencia);
    if (dias > 0) {
      totalVencido += l.valor;
      if (dias <= 30) buckets.vencido1a30 += l.valor;
      else if (dias <= 60) buckets.vencido31a60 += l.valor;
      else if (dias <= 90) buckets.vencido61a90 += l.valor;
      else buckets.vencidoMais90 += l.valor;
    } else {
      buckets.aVencer += l.valor;
    }
  });

  const totalCarteira = abertos.reduce((s, l) => s + l.valor, 0);
  return { abertos, buckets, totalVencido, totalCarteira, aVencer: buckets.aVencer };
}

/** Concentração por parceiro (cliente ou fornecedor) — top N por valor em aberto. */
export function calcularConcentracaoPorParceiro(abertos, top = 5) {
  const porParceiro = new Map();
  abertos.forEach((l) => porParceiro.set(l.clienteFornecedorId, (porParceiro.get(l.clienteFornecedorId) || 0) + l.valor));
  const total = Array.from(porParceiro.values()).reduce((s, v) => s + v, 0);
  return Array.from(porParceiro.entries())
    .map(([id, valor]) => ({ id, valor, pct: total > 0 ? (valor / total) * 100 : 0 }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, top);
}

/** DSO/DPO — Days Sales/Payable Outstanding: (saldo em aberto / valor do período) * dias do período. */
export function calcularDSOouDPO(saldoEmAberto, valorPeriodo, diasPeriodo) {
  if (!valorPeriodo) return null;
  return (saldoEmAberto / valorPeriodo) * diasPeriodo;
}

export function vencimentosProximos(abertos, dataReferencia, dias) {
  const limite = new Date(dataReferencia + "T00:00:00");
  limite.setDate(limite.getDate() + dias);
  const limiteISO = limite.toISOString().slice(0, 10);
  return abertos.filter((l) => l.dataVencimento >= dataReferencia && l.dataVencimento <= limiteISO);
}
