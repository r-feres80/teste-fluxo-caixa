// Funções puras sobre a tabela fato Lancamento. Nenhuma tela ou hook deve
// reimplementar estas regras — Tesouraria, AP, AR, Fluxo de Caixa, DFC e DRE
// todos chamam estas funções.

import { isDataVencida } from "../utils/dateUtils.js";

/** Valor com sinal: Entrada é positivo, Saída é negativo. */
export function valorComSinal(l) {
  return l.tipo === "Entrada" ? l.valor : -l.valor;
}

/**
 * Situação efetiva: a situação armazenada (Previsto/Em aberto/Realizado/Cancelado)
 * é elevada a "Vencido" automaticamente quando ainda não foi Realizada/Cancelada
 * e a Data de Vencimento já passou em relação à Data de Referência. O usuário
 * nunca precisa alternar manualmente para "Vencido".
 */
export function situacaoEfetiva(l, dataReferencia) {
  if (l.situacao === "Realizado" || l.situacao === "Cancelado") return l.situacao;
  if (isDataVencida(l.dataVencimento, dataReferencia)) return "Vencido";
  return l.situacao; // Previsto | Em aberto
}

/** Um lançamento conta para caixa (já pagou/recebeu de fato). */
export function estaRealizado(l) {
  return l.situacao === "Realizado";
}

/** Filtra lançamentos pelas dimensões dos Filtros Globais (empresa/unidade) + intervalo de datas em um campo de data específico. */
export function filtrarLancamentos(lancamentos, { empresaId, unidadeId, inicio, fim, campoData = "competencia" }) {
  return lancamentos.filter((l) => {
    if (empresaId && empresaId !== "TODAS" && l.empresaId !== empresaId) return false;
    if (unidadeId && unidadeId !== "TODAS" && l.unidadeId !== unidadeId) return false;
    const valor = campoData === "competencia" ? `${l.competencia}-01` : l[campoData];
    if (!valor) return false;
    if (inicio && valor < inicio) return false;
    if (fim && valor > fim) return false;
    return true;
  });
}

/** Exclui transferências internas — usado onde só o movimento operacional importa (Entradas/Saídas do dia, DRE, Orçado x Realizado). */
export function excluirTransferencias(lancamentos) {
  return lancamentos.filter((l) => !l.transferencia);
}
