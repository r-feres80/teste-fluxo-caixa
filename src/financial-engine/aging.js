import { diffDaysISO, parseISO } from "../utils/dateUtils.js";
import { situacaoEfetiva } from "./lancamentos.js";

/** Régua de aging estendida (9 faixas de vencido, + "a vencer"). Substitui a
 * régua anterior de 4 faixas em Contas a Pagar e Contas a Receber. */
export const FAIXAS_AGING = [
  { key: "d1a15", label: "1-15", max: 15 },
  { key: "d16a30", label: "16-30", max: 30 },
  { key: "d31a60", label: "31-60", max: 60 },
  { key: "d61a90", label: "61-90", max: 90 },
  { key: "d91a120", label: "91-120", max: 120 },
  { key: "d121a150", label: "121-150", max: 150 },
  { key: "d151a180", label: "151-180", max: 180 },
  { key: "d181a360", label: "181-360", max: 360 },
  { key: "d361mais", label: "361+", max: Infinity },
];

/**
 * Recebe lançamentos já filtrados por tipo (Entrada p/ AR, Saída p/ AP) e
 * calcula a carteira em aberto (Previsto/Em aberto/Vencido) com aging.
 */
export function calcularCarteiraEAging(lancamentos, dataReferencia) {
  const abertos = lancamentos.filter((l) => {
    const sit = situacaoEfetiva(l, dataReferencia);
    return sit === "Previsto" || sit === "Em aberto" || sit === "Vencido";
  });

  const buckets = { aVencer: 0 };
  FAIXAS_AGING.forEach((f) => { buckets[f.key] = 0; });
  let totalVencido = 0;

  abertos.forEach((l) => {
    const dias = diffDaysISO(l.dataVencimento, dataReferencia);
    if (dias > 0) {
      totalVencido += l.valor;
      const faixa = FAIXAS_AGING.find((f) => dias <= f.max);
      buckets[faixa.key] += l.valor;
    } else {
      buckets.aVencer += l.valor;
    }
  });

  const totalCarteira = abertos.reduce((s, l) => s + l.valor, 0);
  return { abertos, buckets, totalVencido, totalCarteira, aVencer: buckets.aVencer };
}

/**
 * Classifica um título Realizado comparando Data de baixa (dataPagamento)
 * com Vencimento — não cria campo novo, usa dados já existentes no schema:
 * Antecipado (baixa < vencimento), Em dia (baixa = vencimento), Atrasado
 * (baixa > vencimento). Retorna null para títulos ainda não Realizados.
 */
export function classificarBaixa(l) {
  if (l.situacao !== "Realizado" || !l.dataPagamento || !l.dataVencimento) return null;
  const dias = diffDaysISO(l.dataVencimento, l.dataPagamento);
  if (dias > 0) return "Atrasado";
  if (dias < 0) return "Antecipado";
  return "Em dia";
}

/** Composição do Recebido: % do valor Realizado em Antecipado/Em dia/Atrasado. */
export function calcularComposicaoRecebido(lancamentosRealizados) {
  let antecipado = 0, emDia = 0, atrasado = 0;
  lancamentosRealizados.forEach((l) => {
    const c = classificarBaixa(l);
    if (c === "Antecipado") antecipado += l.valor;
    else if (c === "Em dia") emDia += l.valor;
    else if (c === "Atrasado") atrasado += l.valor;
  });
  const total = antecipado + emDia + atrasado;
  return {
    antecipado, emDia, atrasado, total,
    antecipadoPct: total > 0 ? (antecipado / total) * 100 : 0,
    emDiaPct: total > 0 ? (emDia / total) * 100 : 0,
    atrasadoPct: total > 0 ? (atrasado / total) * 100 : 0,
  };
}

/**
 * Evolução mensal de inadimplência (%): para cada um dos últimos N meses,
 * entre os títulos com Vencimento naquele mês, qual % está/ficou em atraso —
 * Vencido (ainda em aberto, passado do vencimento) ou Realizado com
 * classificarBaixa === "Atrasado" (pago depois do vencimento).
 */
export function calcularEvolucaoInadimplencia(lancamentos, dataReferencia, quantidadeMeses = 6) {
  const hoje = parseISO(dataReferencia);
  const meses = [];
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push({ ano: d.getFullYear(), mes: d.getMonth() });
  }
  return meses.map(({ ano, mes }) => {
    const doMes = lancamentos.filter((l) => {
      if (!l.dataVencimento) return false;
      const [a, m] = l.dataVencimento.split("-").map(Number);
      return a === ano && m - 1 === mes;
    });
    const total = doMes.reduce((s, l) => s + l.valor, 0);
    const emAtraso = doMes.filter((l) =>
      l.situacao === "Realizado" ? classificarBaixa(l) === "Atrasado" : situacaoEfetiva(l, dataReferencia) === "Vencido"
    ).reduce((s, l) => s + l.valor, 0);
    return {
      label: new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
      pct: total > 0 ? (emAtraso / total) * 100 : 0,
    };
  });
}

/** Concentração por parceiro (cliente ou fornecedor) — top N por valor em aberto.
 * Lançamentos sem Cliente/Fornecedor vinculado (contas internas como Salários,
 * Impostos, Encargos) são excluídos: não representam risco de dependência de
 * fornecedor/cliente e não devem competir por uma posição no ranking. Ver
 * calcularDespesasInternas para o total desse grupo, exibido à parte. */
export function calcularConcentracaoPorParceiro(abertos, top = 5) {
  const porParceiro = new Map();
  abertos.filter((l) => l.clienteFornecedorId).forEach((l) => porParceiro.set(l.clienteFornecedorId, (porParceiro.get(l.clienteFornecedorId) || 0) + l.valor));
  const total = Array.from(porParceiro.values()).reduce((s, v) => s + v, 0);
  return Array.from(porParceiro.entries())
    .map(([id, valor]) => ({ id, valor, pct: total > 0 ? (valor / total) * 100 : 0 }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, top);
}

/** Total em aberto sem Cliente/Fornecedor vinculado (contas internas: Salários,
 * Impostos, Encargos etc.) — exibido à parte, fora do ranking de concentração. */
export function calcularDespesasInternas(abertos) {
  return abertos.filter((l) => !l.clienteFornecedorId).reduce((s, l) => s + l.valor, 0);
}

/** DSO/DPO — Days Sales/Payable Outstanding: (saldo em aberto / valor do período) * dias do período. */
export function calcularDSOouDPO(saldoEmAberto, valorPeriodo, diasPeriodo) {
  if (!valorPeriodo) return null;
  return (saldoEmAberto / valorPeriodo) * diasPeriodo;
}

/** Títulos com vencimento entre hoje e "dias" dias à frente — usa diffDaysISO
 * como toda comparação de data do app (mesma base do Aging), em vez de
 * comparação de string, que falhava a depender do formato armazenado. */
export function vencimentosProximos(abertos, dataReferencia, dias) {
  return abertos.filter((l) => {
    const diasAteVencer = diffDaysISO(dataReferencia, l.dataVencimento);
    return diasAteVencer >= 0 && diasAteVencer <= dias;
  });
}
