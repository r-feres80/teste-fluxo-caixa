import { addDaysISO } from "../utils/dateUtils.js";
import { valorComSinal, situacaoEfetiva, excluirTransferencias } from "./lancamentos.js";

/**
 * Constrói a série diária de caixa projetado: Saldo Inicial (caixa consolidado
 * na Data de Referência) + Compromissado (Em aberto) + Previsto, dia a dia,
 * até o horizonte pedido. Realizado nunca entra como projeção futura — só
 * Compromissado/Previsto com vencimento futuro.
 */
export function buildFluxoCaixaDiario({ lancamentos, saldoInicialConsolidado, dataReferencia, diasHorizonte }) {
  const fim = addDaysISO(dataReferencia, diasHorizonte);
  const semTransferencia = excluirTransferencias(lancamentos);

  const atrasados = semTransferencia.filter((l) => situacaoEfetiva(l, dataReferencia) === "Vencido");
  const somaAtrasados = atrasados.reduce((s, l) => s + valorComSinal(l), 0);

  const futuros = semTransferencia.filter((l) => {
    const sit = situacaoEfetiva(l, dataReferencia);
    return (sit === "Previsto" || sit === "Em aberto") && l.dataVencimento > dataReferencia && l.dataVencimento <= fim;
  });

  let saldo = saldoInicialConsolidado + somaAtrasados;
  const serie = [{ data: dataReferencia, saldo, entradas: 0, saidas: 0 }];
  for (let i = 1; i <= diasHorizonte; i++) {
    const dia = addDaysISO(dataReferencia, i);
    const doDia = futuros.filter((l) => l.dataVencimento === dia);
    const entradas = doDia.filter((l) => l.tipo === "Entrada").reduce((s, l) => s + l.valor, 0);
    const saidas = doDia.filter((l) => l.tipo === "Saída").reduce((s, l) => s + l.valor, 0);
    saldo += entradas - saidas;
    serie.push({ data: dia, saldo, entradas, saidas });
  }
  return serie;
}

export function menorPontoDaSerie(serie) {
  return serie.reduce((min, p) => (p.saldo < min.saldo ? p : min), serie[0]);
}

export const HORIZONTES_DIAS = [
  { id: 7, label: "7 dias" }, { id: 15, label: "15 dias" }, { id: 30, label: "30 dias" },
  { id: 60, label: "60 dias" }, { id: 90, label: "90 dias" }, { id: 365, label: "12 meses" },
];
