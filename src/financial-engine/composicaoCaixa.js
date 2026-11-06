// Composição do Caixa: quebra do movimento Realizado (Antecipado/Em dia/
// Atrasado, comparando Data de baixa x Vencimento — ver classificarBaixa em
// aging.js) por dia, mês, parceiro (Cliente/Fornecedor) e Conta Bancária.
// Todas as funções reaproveitam calcularComposicaoRecebido como agregador
// comum, para não duplicar a lógica de acúmulo/percentual em cada recorte.

import { calcularComposicaoRecebido } from "./aging.js";
import { addDaysISO, isDiaUtil } from "../utils/dateUtils.js";

/** Composição diária: um ponto por dia de calendário, do mais antigo ao mais
 * recente, usando Data de baixa (dataPagamento) como o dia do movimento.
 * `somenteDiasUteis`: remove sábado/domingo da série (não plota "vazio" em
 * dia que banco não processa) — janela de calendário continua a mesma, só
 * os pontos de fim de semana saem do array. */
export function calcularComposicaoDiaria(lancamentosRealizados, dataFim, quantidadeDias, somenteDiasUteis = false) {
  const dias = [];
  for (let i = quantidadeDias - 1; i >= 0; i--) dias.push(addDaysISO(dataFim, -i));
  return dias
    .filter((dia) => !somenteDiasUteis || isDiaUtil(dia))
    .map((dia) => ({
      data: dia,
      ...calcularComposicaoRecebido(lancamentosRealizados.filter((l) => l.dataPagamento === dia)),
    }));
}

/** Composição mensal, últimos N meses até ano/mês de referência (mesmo
 * padrão de buildFluxoCaixaMensal em indicadoresCaixa.js). */
export function calcularComposicaoMensal(lancamentosRealizados, anoRef, mesRef, quantidadeMeses = 6) {
  const meses = [];
  for (let i = quantidadeMeses - 1; i >= 0; i--) {
    const d = new Date(anoRef, mesRef - i, 1);
    meses.push({ ano: d.getFullYear(), mes: d.getMonth() });
  }
  return meses.map(({ ano, mes }) => {
    const doMes = lancamentosRealizados.filter((l) => {
      if (!l.dataPagamento) return false;
      const [a, m] = l.dataPagamento.split("-").map(Number);
      return a === ano && m - 1 === mes;
    });
    return {
      label: new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", ""),
      ...calcularComposicaoRecebido(doMes),
    };
  });
}

/** Composição por parceiro (Cliente ou Fornecedor) — top N por volume total Realizado. */
export function calcularComposicaoPorParceiro(lancamentosRealizados, top = 6) {
  const porParceiro = new Map();
  lancamentosRealizados.filter((l) => l.clienteFornecedorId).forEach((l) => {
    porParceiro.set(l.clienteFornecedorId, [...(porParceiro.get(l.clienteFornecedorId) || []), l]);
  });
  return Array.from(porParceiro.entries())
    .map(([id, lista]) => ({ id, tipoParceiro: lista[0].tipoParceiro, ...calcularComposicaoRecebido(lista) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, top);
}

/** Composição por Conta Bancária (todas com movimento, sem corte de top N). */
export function calcularComposicaoPorContaBancaria(lancamentosRealizados) {
  const porConta = new Map();
  lancamentosRealizados.filter((l) => l.contaBancariaId).forEach((l) => {
    porConta.set(l.contaBancariaId, [...(porConta.get(l.contaBancariaId) || []), l]);
  });
  return Array.from(porConta.entries())
    .map(([id, lista]) => ({ id, ...calcularComposicaoRecebido(lista) }))
    .sort((a, b) => b.total - a.total);
}
